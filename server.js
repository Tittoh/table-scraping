'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const Sequelize = require('sequelize');
require('dotenv').config();

var datetime = new Date();
const new_table = 'day_' + datetime.toISOString().slice(0,10).replace(/-/g, '_')
console.log(new_table);

const app = express();
const env = process.env

app.use(bodyParser.json({ type: 'application/json' }));
app.use(cors());

// db config
const sequelize = new Sequelize(
  env.PGDATABASE,
  env.USERNAME,
  env.PGPASSWORD, 
  {
    host: 'localhost',
    dialect: 'postgres',
  });
sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Model

const World = sequelize.define(new_table, {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  country: {
    type: Sequelize.STRING,
    unique: 'compositeIndex',
  },
  total_cases: Sequelize.STRING,
  new_cases: Sequelize.STRING,
  total_deaths: Sequelize.STRING,
  new_deaths: Sequelize.STRING,
  total_recovered: Sequelize.STRING,
  active_cases: Sequelize.STRING,
  critical: Sequelize.STRING,
  cases_per_mil: Sequelize.STRING,
  deaths_per_mil: Sequelize.STRING,
  first_case: Sequelize.STRING,
});

World.sync()
  .then(() => {
    // Table created
    console.log( new_table +' table created');
});


// GET: Home
app.get('/', (request, response) => {
  response.json('Welcome! This is the very beginning of nothingness. Cheers')
});

app.post('/scrape', function(req, res){

  const url = 'https://www.worldometers.info/coronavirus/';

  axios(url)
      .then(response => {
        const html = response.data;
        const $ = cheerio.load(html)
        const data = [];

        $("#main_table_countries_today > tbody > tr").each((index,element) => {
          const tds = $(element).find("td");
          const country = $(tds[0]).text();
          const total_cases = $(tds[1]).text();
          const new_cases = $(tds[2]).text();
          const total_deaths = $(tds[3]).text();
          const new_deaths = $(tds[4]).text();
          const total_recovered = $(tds[5]).text();
          const active_cases = $(tds[6]).text();
          const critical = $(tds[7]).text();
          const cases_per_mil = $(tds[8]).text();
          const deaths_per_mil = $(tds[9]).text();
          const first_case = $(tds[10]).text().slice(1);

          const tableData = { country, total_cases, new_cases, total_deaths, new_deaths,
            total_recovered, active_cases, critical, cases_per_mil, deaths_per_mil, first_case
          };
  
          data.push(tableData);
        })
        World
          .bulkCreate(data, {
            updateOnDuplicate: ["total_cases", "new_cases", "total_deaths", "new_deaths",
              "total_recovered", "active_cases", "critical", "cases_per_mil", "deaths_per_mil", "first_case", "updatedAt"] 
        })
          .then(world => {
            res.status(201).json(world);
          })
      })
      .catch(console.error);
})

app.listen(process.env.PORT, process.env.HOST, () => {
  console.log(`Server is running at http://${env.HOST}:${env.PORT}`)
});
