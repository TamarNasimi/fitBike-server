const express = require('express')
const app = express()
const cors = require('cors')
const port = 3000
app.use(cors())
app.use(express.json());
const router = express.Router();

var mysql = require('mysql2');


const { planRoute } = require('../BLL/planRoute'); 

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234",
    port: 3306,
    database: "bicycle_track"
});

con.connect(function (err) {
    if (err) throw err;
});


app.post('/checkLogin/', (req, res) => {

    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    con.query(query, [email, password], (err, results) => {
        if (err) {
            res.status(500).send({ message: 'Server error' });
            return;
        }

        if (results.length > 0) {
            const id= results[0].id;
            const username= results[0].user_name;
            res.status(200).send({ message: 'Login successful', user: {id, username, email, password}});
        } else {
            res.status(401).send({ message: 'Invalid email or password' });
        }
    });
})

app.post('/checkRegister/', (req, res) => {
    const { username, email, password } = req.body;
    const query = 'SELECT * FROM users WHERE user_name = ? AND email = ? AND password = ?';
    con.query(query, [username, email, password], (err, results) => {
        if (err) {
            res.status(500).send({ message: 'Server error' });
            return;
        }

        if (results.length > 0) {
            res.status(401).send({ message: 'You already exist' });
        } else {
            const insertQuery = "INSERT INTO users (user_name, email, password) VALUES (?, ?, ?)";
            con.query(insertQuery, [username, email, password], (err, results) => {
                if (err) {
                    res.status(500).send({ message: 'Server error' });
                    return;
                } else {
                    const id= results.insertId;
                    res.status(200).send({ message: 'Registration successful', user: {id, username, email, password } });
                }
            });
        }
    });
});



app.post('/planRoute/', async (req, res) => {
    const { tripPurpose, startingPoint, destination, stopPoints, fitnessLevel, id_user, selectedTime } = req.body;
    
    try {
        var sql = "UPDATE users SET fitness_level = ? WHERE id = ?";
        con.query(sql, [fitnessLevel, id_user], async (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ message: 'Server error' });
            }
            
            try {   
                const routeData = await planRoute(startingPoint, destination, stopPoints, selectedTime, fitnessLevel, tripPurpose);
                return res.json(routeData);
            } catch (error) {
                console.error('Error fetching route data:', error);
                return res.status(500).json({ error: "Internal Server Error" });
            }
        });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).send({ message: 'Server error' });
    }
});


app.listen(port, () => { console.log(`app listening to port ${port}`) })