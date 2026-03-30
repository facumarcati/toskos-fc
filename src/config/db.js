import mongoose from "mongoose";

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.URI_MONGODB);
  } catch (error) {
    process.exit(1);
  }
};

export default connectMongoDB;
