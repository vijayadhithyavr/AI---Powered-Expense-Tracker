const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const db = require('./db');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static('public'));

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.query('INSERT INTO Users (username, password) VALUES (?, ?)',
        [username, hash],
        (err) => {
            if (err) return res.status(500).send('User exists or error');
            res.send('Registered Successfully');
        }
    );
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM Users WHERE username = ?', [username], (err, result) => {
        if (err || result.length === 0) return res.status(400).send('Invalid user');
        if (bcrypt.compareSync(password, result[0].password)) {
            req.session.user_id = result[0].user_id;
            res.send('Login Successful');
        } else res.status(400).send('Wrong password');
    });
});

app.post('/transactions', (req, res) => {
    if (!req.session.user_id) return res.status(401).send('Login first');
    const { amount, category, date } = req.body;
    db.query(
        'INSERT INTO Transactions (user_id, amount, category, transaction_date) VALUES (?, ?, ?, ?)',
        [req.session.user_id, amount, category, date],
        (err) => err ? res.status(500).send(err) : res.send('Transaction Added')
    );
});

app.get('/transactions', (req, res) => {
    if (!req.session.user_id) return res.status(401).send('Login first');
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM Transactions WHERE user_id = ?';
    let params = [req.session.user_id];

    if (startDate && endDate) {
        query += ' AND transaction_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    query += ' ORDER BY transaction_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, result) => err ? res.status(500).send(err) : res.json(result));
});

app.put('/transactions/:id', (req, res) => {
    const { amount, category, date } = req.body;
    db.query(
        'UPDATE Transactions SET amount=?, category=?, transaction_date=? WHERE transaction_id=? AND user_id=?',
        [amount, category, date, req.params.id, req.session.user_id],
        (err) => err ? res.status(500).send(err) : res.send('Updated')
    );
});

app.delete('/transactions/:id', (req, res) => {
    db.query(
        'DELETE FROM Transactions WHERE transaction_id=? AND user_id=?',
        [req.params.id, req.session.user_id],
        (err) => err ? res.status(500).send(err) : res.send('Deleted')
    );
});

app.get('/budget', (req, res) => {
    db.query(
        'SELECT * FROM Budgets WHERE user_id=?',
        [req.session.user_id],
        (err, result) => err ? res.status(500).send(err) : res.json(result)
    );
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
