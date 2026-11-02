const path = require('node:path');

const dataDirectory = process.env.JSMART_DATA_DIR || path.join(__dirname, 'data');
const uploadsDirectory = process.env.JSMART_DATA_DIR
  ? path.join(process.env.JSMART_DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads');

module.exports = {
  dataDirectory,
  databasePath: path.join(dataDirectory, 'jsmart.sqlite'),
  uploadsDirectory,
  productUploadsDirectory: path.join(uploadsDirectory, 'products'),
};
