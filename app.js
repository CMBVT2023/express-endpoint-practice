import express, { json } from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'

const app = express();

dotenv.config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

app.use(cors());

// Parses the body data if any is sent when making a request
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
    const [cars] = await req.db.query(`SELECT * FROM car WHERE deleted_flag IS NULL;`)

    res.status(200).json(cars);
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
       VALUES (:make, :model, :year);`,
      {
        make,
        model,
        year,
      }
    );
  
    res.status(200).json({ success: true, message: 'Car successfully created', data: null });
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
        UPDATE car SET deleted_flag = 1 WHERE id = :dbID;
        `, {
            dbID
        })

    res.status(200).json(`Successfully deleted data associated with id: ${dbID}.`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server failed to update data in the car table.");
  }
});

//? The PUT endpoint should update a column of a specific row in the `car` table with data that was sent from the front end
app.put('/car', async function(req,res) {
  try {
    //* Data from the body becomes usable after the body is parsed into json, which is done using the use method above.
    let { dbID, newMake, newModel, newYear } = req.body

    const query = await req.db.query(`
        UPDATE car SET 
        make = :newMake, 
        model = :newModel, 
        year = :newYear 
        WHERE id = :dbID;
        `,
        {
            newMake,
            newModel,
            newYear,
            dbID
        }
    )

    res.status(200).json(`Successfully updated data associated with id: ${dbID}.`)
  } catch (err) {
    console.error(err);
    res.status(500).send("Server failed to update data in the car table.");
  }
});

app.post('/register', async (req, res) => {
  try {
    const { userName, userKey } = req.body

    // Try changing the salt value to a randomly changing number to see if it breaks anything
    const hashedKey = await bcrypt.hash(userKey, 10)

    const [user] = await req.db.query(
      `INSERT INTO users (username, userkey)
      VALUES (:userName, :hashedKey)`,
      {
        userName,
        hashedKey
      }
    )

    console.log(user)

    const jwtSignedUser = jwt.sign(
      { userID: user.insertId, userName },
      process.env.JWT_KEY
    );

    res.status(200).json({jwt: jwtSignedUser, success: true});
  } catch (error) {
    console.error(error);
    res.status(500).send("Server failed to register new user.");
  }
})

app.post('/log-in', async (req, res) => {
  try {
    const { userName, userKey } = req.body;

    const [[user]] = await req.db.query(
      `SELECT * FROM users WHERE username = :userName`, { userName }
    );

    if (!user) throw new Error('User does not exist!')

    // Make sure the hashed password is seen as a string when comparing it.
    const hashedKey = `${user.userkey}`
    const isPasswordAMatch = await bcrypt.compare(userKey, hashedKey);

    if (!isPasswordAMatch) throw new Error("Username or password is incorrect.")
      
    const jsonPayload = {
      id: user.id,
      username: user.username,
    };

    const jwtEncodedUser = jwt.sign(jsonPayload, process.env.JWT_KEY);
    
    res.status(200).json({jwt: jwtEncodedUser, success: true})
  } catch (error) {
    console.error(error);
    res.status(500).send("Server failed to register new user.");
  }
})

app.get('/test', (req, res) => {
    console.log('Connection made...');
    let connectionTime = new Date
    res.json({connection: 'successful', time: connectionTime})
})

app.listen(port, () => console.log(`244 API Example listening on http://localhost:${port}`));
