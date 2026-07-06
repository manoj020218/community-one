module.exports = async () => {
  const mongoServer = (global as any).__MONGO_SERVER__;
  if (mongoServer) {
    await mongoServer.stop();
  }
};
