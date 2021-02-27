const mongoose = require('mongoose')

const { Schema } = mongoose

//* Schemat zadań które będą wprowadzali użytkownicy do bazdy danych.

const taskSchema = new Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  //* dodanie relacji owner która łączy się z użytkownikiem i bierze jego id i dodaje do bazy. Jest ona wymagana
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
}, {
  timestamps: true
})

const Task = mongoose.model('Task', taskSchema)

module.exports = Task
