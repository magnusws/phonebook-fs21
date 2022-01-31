require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const morgan = require('morgan')
const cors = require('cors')
const Person = require('./models/person')
const { estimatedDocumentCount } = require('./models/person')

const app = express()

// Middlewares
app.use(express.static('build'))
app.use(express.json())
app.use(cors())

// Morgan:
morgan.token('data', (req) => {
  return req.method === 'POST'
    ? JSON.stringify(req.body)
    : null
})

// Custom log format ('tiny' format including 'data' token at the end).
morgan.format(
  'tiny',
  ':method :url :status :res[content-length] - :response-time ms :data'
)

// App use morgan with modified 'tiny' format.
app.use(morgan('tiny'))

//GET: info page
app.get('/info', (request, response) => {
  Person.countDocuments()
    .then((personCount) => {
      response.send(`
        <p>Phonebook has info for ${personCount} people</p>
        <p>${new Date()}</p>
      `)
    })
})

// GET: all phonebook entries
app.get('/api/persons', (request, response) => {
  Person.find({})
    .then(persons => {
      response.json(persons)
    })
})

// GET: information for a single phonebook entry
app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        response.json(person)
      } else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
})

// DELETE: a single phonebook entry
app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndRemove(request.params.id)
    .then(result => {
      response.status(204).end()
    })
    .catch(error => next(error))
})

// POST: a new phonebook entry
app.post('/api/persons', (request, response) => {
  const body = request.body

  // return error if data is missing
  if (!body.name || !body.number) {
    return response.status(400).json({
      error: 'content missing'
    })
  }

  const person = new Person({
    name: body.name,
    number: body.number
  })

  person.save()
    .then(savedPerson => {
      response.json(savedPerson)
    })

})

// PUT: change data for one person by id
app.put('/api/persons/:id', (request, response, next) => {
  const body = request.body

  const person = {
    name: body.name,
    number: body.number,
  }

  Person.findByIdAndUpdate(request.params.id, person, { new: true })
    .then(updatedPerson => {
      response.json(updatedPerson)
    })
    .catch(error => next(error))
})


const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

// handler of requests with unknown endpoint
app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  }

  next(error)
}

// ! has to be the last loaded middleware.
app.use(errorHandler)


const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})