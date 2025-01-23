import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

const app = express();

dotenv.config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

/* 

 */

app.use(cors());

app.use(express.json());

app.use(async function(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

//? The GET endpoint should query the database and fetch all the data in the `car` table where the `deleted_flag` value is 0,
//? then return the data to the front end (you should use Insomnia, Postman, or something similar to those to make the requests to test)
app.get('/cars', async function(req, res) {
  try {
    const [cars] = await req.db.query(`SELECT * FROM car WHERE deleted_flag = 0;`)

    res.json(cars);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server failed to gather data from the car table.");
  }
});

app.post('/car', async function(req, res) {
  try {
    const { make, model, year } = req.body;
  
    const query = await req.db.query(
      `INSERT INTO car (make, model, year) 
       VALUES (:make, :model, :year)`,
      {
        make,
        model,
        year,
      }
    );
  
    res.json({ success: true, message: 'Car successfully created', data: null });
  } catch (err) {
    res.json({ success: false, message: err, data: null })
  }
});

/* The DELETE endpoint should change the `deleted_flag` value of a certain row in the `car` table from 0 to 1, to signify it as "deleted".
You should send the id of the row to be updated in the URL. */
app.delete('/car/:id', async function(req,res) {
  try {
    let { id: dbID } = req.params;

    const query = await req.db.query(`
        UPDATE car SET deleted_flag = 1 WHERE id = :dbID
        `, {
            dbID
        })

    res.json(`Successfully deleted data associated with id: ${dbID}.`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server failed to update data in the car table.");
  }
});

/* The PUT endpoint should update a column of a specific row in the `car` table with data that was sent from the front end */
app.put('/car', async function(req,res) {
  try {

    let { dbID, newMake, newModel, newYear } = req.body


  } catch (err) {
    console.error(err);
    res.status(500).send("Server failed to update data in the car table.");
  }
});

app.get('/test', (req, res) => {
    console.log('Connection made...');
    let connectionTime = new Date
    res.json({connection: 'successful', time: connectionTime})
})

app.listen(port, () => console.log(`244 API Example listening on http://localhost:${port}`));