const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
let registerUser = require("./auth_users.js").registerUser;
const public_users = express.Router();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Task 7 & Public: User registration
 * Expected endpoint: POST /register (and /customer/register)
 */
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  const result = registerUser(username, password);
  return res.status(result.status).json({ message: result.message });
});

/**
 * Task 2 & Task 10: Retrieve all books
 * Expected endpoint: GET /books (and GET /)
 * Implemented using JavaScript Promise resolution
 */
public_users.get(['/', '/books'], function (req, res) {
  const getBooksPromise = new Promise((resolve, reject) => {
    try {
      resolve(books);
    } catch (err) {
      reject(err);
    }
  });

  getBooksPromise
    .then((bookList) => {
      return res.status(200).json(bookList);
    })
    .catch((error) => {
      return res.status(500).json({ message: "Error retrieving books", error: error.message });
    });
});

/**
 * Task 3 & Task 11: Search books by ISBN
 * Expected endpoint: GET /isbn/:isbn
 * Implemented using JavaScript Promise callbacks
 */
public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;

  const getBookByISBNPromise = new Promise((resolve, reject) => {
    const book = books[isbn];
    if (book) {
      resolve(book);
    } else {
      reject(new Error(`Book with ISBN ${isbn} not found`));
    }
  });

  getBookByISBNPromise
    .then((book) => {
      return res.status(200).json(book);
    })
    .catch((error) => {
      return res.status(404).json({ message: error.message });
    });
});

/**
 * Task 4 & Task 12: Search books by author
 * Expected endpoint: GET /author/:author
 * Implemented using async/await with Promise
 */
public_users.get('/author/:author', async function (req, res) {
  const targetAuthor = req.params.author.trim().toLowerCase();

  try {
    const matchingBooks = await new Promise((resolve) => {
      const results = [];
      const keys = Object.keys(books);
      for (const isbn of keys) {
        if (books[isbn].author.toLowerCase() === targetAuthor) {
          results.push({
            isbn: isbn,
            author: books[isbn].author,
            title: books[isbn].title,
            reviews: books[isbn].reviews
          });
        }
      }
      resolve(results);
    });

    if (matchingBooks.length > 0) {
      return res.status(200).json(matchingBooks);
    } else {
      return res.status(404).json({ message: `No books found for author '${req.params.author}'.` });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving books by author", error: error.message });
  }
});

/**
 * Task 5 & Task 13: Search books by title
 * Expected endpoint: GET /title/:title
 * Implemented using async/await with Promise
 */
public_users.get('/title/:title', async function (req, res) {
  const targetTitle = req.params.title.trim().toLowerCase();

  try {
    const matchingBooks = await new Promise((resolve) => {
      const results = [];
      const keys = Object.keys(books);
      for (const isbn of keys) {
        if (books[isbn].title.toLowerCase() === targetTitle) {
          results.push({
            isbn: isbn,
            author: books[isbn].author,
            title: books[isbn].title,
            reviews: books[isbn].reviews
          });
        }
      }
      resolve(results);
    });

    if (matchingBooks.length > 0) {
      return res.status(200).json(matchingBooks);
    } else {
      return res.status(404).json({ message: `No books found with title '${req.params.title}'.` });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving books by title", error: error.message });
  }
});

/**
 * Task 6: Retrieve book reviews
 * Expected endpoint: GET /review/:isbn
 */
public_users.get('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  const book = books[isbn];

  if (!book) {
    return res.status(404).json({ message: `Book with ISBN ${isbn} not found.` });
  }

  return res.status(200).json(book.reviews || {});
});

/* ==========================================================================
   Task 10 to Task 13: Axios implementations using Promises and async/await
   ========================================================================== */

/**
 * Task 10: Fetch all books using Axios with Promises / async-await
 * @param {string} [baseURL] 
 * @returns {Promise<Object>}
 */
async function getAllBooks(baseURL = BASE_URL) {
  try {
    const response = await axios.get(`${baseURL}/books`);
    return response.data;
  } catch (error) {
    throw new Error(error.response ? error.response.data.message : error.message);
  }
}

/**
 * Task 11: Fetch book by ISBN using Axios with Promises
 * @param {string|number} isbn 
 * @param {string} [baseURL] 
 * @returns {Promise<Object>}
 */
function getBookByISBN(isbn, baseURL = BASE_URL) {
  return new Promise((resolve, reject) => {
    axios.get(`${baseURL}/isbn/${isbn}`)
      .then((response) => resolve(response.data))
      .catch((error) => {
        const msg = error.response && error.response.data && error.response.data.message
          ? error.response.data.message
          : error.message;
        reject(new Error(msg));
      });
  });
}

/**
 * Task 12: Fetch books by author using Axios with async/await
 * @param {string} author 
 * @param {string} [baseURL] 
 * @returns {Promise<Array>}
 */
async function getBooksByAuthor(author, baseURL = BASE_URL) {
  try {
    const response = await axios.get(`${baseURL}/author/${encodeURIComponent(author)}`);
    return response.data;
  } catch (error) {
    const msg = error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : error.message;
    throw new Error(msg);
  }
}

/**
 * Task 13: Fetch books by title using Axios with async/await
 * @param {string} title 
 * @param {string} [baseURL] 
 * @returns {Promise<Array>}
 */
async function getBooksByTitle(title, baseURL = BASE_URL) {
  try {
    const response = await axios.get(`${baseURL}/title/${encodeURIComponent(title)}`);
    return response.data;
  } catch (error) {
    const msg = error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : error.message;
    throw new Error(msg);
  }
}

/* --------------------------------------------------------------------------
   Dedicated Asynchronous Endpoints demonstrating Axios consumption directly
   -------------------------------------------------------------------------- */

// Task 10 endpoint: GET /axios/books
public_users.get('/axios/books', async (req, res) => {
  try {
    const data = await getAllBooks();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Axios retrieval failed", error: error.message });
  }
});

// Task 11 endpoint: GET /axios/isbn/:isbn
public_users.get('/axios/isbn/:isbn', (req, res) => {
  getBookByISBN(req.params.isbn)
    .then((data) => res.status(200).json(data))
    .catch((error) => res.status(404).json({ message: error.message }));
});

// Task 12 endpoint: GET /axios/author/:author
public_users.get('/axios/author/:author', async (req, res) => {
  try {
    const data = await getBooksByAuthor(req.params.author);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
});

// Task 13 endpoint: GET /axios/title/:title
public_users.get('/axios/title/:title', async (req, res) => {
  try {
    const data = await getBooksByTitle(req.params.title);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
});

module.exports = {
  general: public_users,
  getAllBooks,
  getBookByISBN,
  getBooksByAuthor,
  getBooksByTitle
};
