#!/usr/bin/env node

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  const numWorkers = process.env.NODE_ENV === 'production' ? numCPUs : 1;
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker');
    cluster.fork();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });
} else {
  // Workers can share any TCP connection
  require('./server.js');
  console.log(`Worker ${process.pid} started`);
}
