const app = require('./service.js');
const metrics = require('./metrics.js');

const logger = require('./logger.js');

process.on('uncaughtException', (err) => logger.unhandledErrorLogger(err));
process.on('unhandledRejection', (err) => logger.unhandledErrorLogger(err instanceof Error ? err : new Error(String(err))));

const port = process.argv[2] || 3000;
metrics.start(10000);
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
