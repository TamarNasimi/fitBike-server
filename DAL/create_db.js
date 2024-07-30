var mysql = require('mysql2');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "12345678",
  port:3306
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  con.query("CREATE DATABASE bicycle_track", function (err, result) {
    if (err) throw err;
    console.log("Database created");
  });
});