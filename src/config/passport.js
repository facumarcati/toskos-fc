import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.js";



// Serialize / Deserialize
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password");
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          return done(null, false, { message: "Credenciales incorrectas." });
        }

        if (!user.password) {
          return done(null, false, {
            message: "Esta cuenta usa Google para iniciar sesión.",
          });
        }

        if (user.isLocked) {
          return done(null, false, {
            message: "Cuenta bloqueada temporalmente. Intentá en 15 minutos.",
          });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
          await user.incLoginAttempts();
          return done(null, false, { message: "Credenciales incorrectas." });
        }

        if (user.loginAttempts > 0) {
          await user.updateOne({
            $set: { loginAttempts: 0 },
            $unset: { lockUntil: 1 },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// 🔥 GOOGLE STRATEGY (SIN IF)
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "test",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "test",
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:8081/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) return done(null, user);

        const email = profile.emails?.[0]?.value;

        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            if (!user.avatar) user.googleAvatar = profile.photos?.[0]?.value;
            await user.save();
            return done(null, user);
          }
        }

        user = await User.create({
          googleId: profile.id,
          email: email || `${profile.id}@google.com`,
          displayName: profile.displayName,
          googleAvatar: profile.photos?.[0]?.value,
        });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;