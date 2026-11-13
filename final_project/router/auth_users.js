const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

/**
 * Check if the username is valid (non-empty string of suitable length)
 * @param {string} username 
 * @returns {boolean}
 */
const isValid = (username) => {
  return typeof username === 'string' && username.trim().length >= 3;
};

/**
 * Check if the username already exists in records
 * @param {string} username 
 * @returns {boolean}
 */
const doesExist = (username) => {
  return users.some((user) => user.username.toLowerCase() === username.trim().toLowerCase());
};

/**
 * Check if username and password match records using secure bcrypt comparison
 * @param {string} username 
 * @param {string} password 
 * @returns {boolean}
 */
const authenticatedUser = (username, password) => {
  if (!username || !password) return false;
  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) return false;
  try {
    return bcrypt.compareSync(password, user.password);
  } catch (err) {
    return false;
  }
};

/**
 * Register a new user with securely hashed password
 * @param {string} username 
 * @param {string} password 
 * @returns {{success: boolean, message: string, status: number}}
 */
const registerUser = (username, password) => {
  if (!username || !password) {
    return { success: false, status: 400, message: "Username and password are required." };
  }
  const cleanUsername = username.trim();
  if (!isValid(cleanUsername)) {
    return { success: false, status: 400, message: "Invalid username. Must be at least 3 characters long." };
  }
  if (typeof password !== 'string' || password.length < 4) {
    return { success: false, status: 400, message: "Password must be at least 4 characters long." };
  }
  if (doesExist(cleanUsername)) {
    return { success: false, status: 409, message: "User already exists!" };
  }

  // Hash password securely with bcrypt
  const hashedPassword = bcrypt.hashSync(password, 10);
  users.push({ username: cleanUsername, password: hashedPassword });
  return { success: true, status: 201, message: "Customer successfully registered. Now you can login." };
};

// User registration endpoint on /customer/register
regd_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  const result = registerUser(username, password);
  return res.status(result.status).json({ message: result.message });
});

// User login endpoint on /customer/login
regd_users.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const cleanUsername = username.trim();
  if (!authenticatedUser(cleanUsername, password)) {
    return res.status(401).json({ message: "Invalid login credentials." });
  }

  // Generate JWT access token
  const accessToken = jwt.sign(
    { data: cleanUsername },
    'access',
    { expiresIn: 60 * 60 }
  );

  // Maintain session
  req.session.authorization = {
    accessToken,
    username: cleanUsername
  };

  return res.status(200).json({
    message: "Customer successfully logged in",
    token: accessToken
  });
});

// Add or modify a book review: PUT /customer/auth/review/:isbn
regd_users.put("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const review = req.query.review || (req.body && req.body.review);

  if (!review) {
    return res.status(400).json({ message: "Review content is required." });
  }

  // Identify authenticated username from session or token payload
  const username = (req.session && req.session.authorization && req.session.authorization.username) ||
                   (req.user && (req.user.data || req.user.username)) ||
                   req.user;

  if (!username) {
    return res.status(401).json({ message: "Unauthorized: User not identified." });
  }

  const book = books[isbn];
  if (!book) {
    return res.status(404).json({ message: `Book with ISBN ${isbn} not found.` });
  }

  if (!book.reviews) {
    book.reviews = {};
  }

  const isUpdate = Boolean(book.reviews[username]);
  book.reviews[username] = review;

  return res.status(200).json({
    message: isUpdate
      ? `Review by ${username} for ISBN ${isbn} successfully updated.`
      : `Review by ${username} for ISBN ${isbn} successfully added.`,
    reviews: book.reviews
  });
});

// Delete a book review: DELETE /customer/auth/review/:isbn
regd_users.delete("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;

  // Identify authenticated username from session or token payload
  const username = (req.session && req.session.authorization && req.session.authorization.username) ||
                   (req.user && (req.user.data || req.user.username)) ||
                   req.user;

  if (!username) {
    return res.status(401).json({ message: "Unauthorized: User not identified." });
  }

  const book = books[isbn];
  if (!book) {
    return res.status(404).json({ message: `Book with ISBN ${isbn} not found.` });
  }

  if (!book.reviews || !book.reviews[username]) {
    return res.status(404).json({ message: `No review found for user '${username}' on ISBN ${isbn}.` });
  }

  // Delete the review belonging exclusively to this logged-in user
  delete book.reviews[username];

  return res.status(200).json({
    message: `Review for ISBN ${isbn} posted by ${username} deleted successfully.`,
    reviews: book.reviews
  });
});

module.exports = {
  authenticated: regd_users,
  isValid,
  doesExist,
  authenticatedUser,
  registerUser,
  users
};
