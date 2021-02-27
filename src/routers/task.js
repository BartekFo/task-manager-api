const express = require('express')
const Task = require('../db/models/task')
const auth = require('../middleware/auth')
const router = express.Router()
//* wszystkie routy od API które tyczą się zadań w naszym task managerze.

router.post('/tasks', auth, async (req, res) => {
  //* dodanie zadania do bazy wraz z informacją o tym kogo to jest zadanie
  const task = new Task({
    ...req.body,
    owner: req.user._id
  })

  try {
    await task.save()
    res.status(201).send(task)
  } catch (error) {
    res.status(400).send(error)
  }
})

//* pobieranie danych tylko tych które mają status zakończone lub nie
//* Get /tasks?completed=false/true
//* pobieranie danych z limitem i wyborem co ile pomijać
//* Get /tasks?limit=10&skip=0
//* pobieranie danych w odpowiednim sortowaniu
//* Get /tasks?sortBy=createdAt_asc/desc
router.get('/tasks', auth, async (req, res) => {
  //* Używamy relacji użytkownika z tablą zadań by odesłać te zadania które należą do użytkownika
  //* stworzenie pustych obiektów na wypadek gdyby nie zostały podane żadne kryteria
  const match = {}
  const sort = {}

  if (req.query.isCompleted) {
    //* sprawdzamy czy kryterium zostało podane, a jeśli tak to porównujemy bo zostanie w tym zwrócony string. Dlatego właśnie używamy potrójnego równa się by mieć pewnosć, że zostanie zwrócony boolean
    match.isCompleted = req.query.isCompleted === 'true'
  }

  if (req.query.sortBy) {
    //* sprawdzamy czy kryterium zostało podane, a jeśli tak to rodzielamy przychodzące query przez znak ustalony wcześniej np :, a potem dodajemy obydwie wartości do obiektu sort. Używamy tenary operator by sprawdzić czy jest to desc czy asc
    const parts = req.query.sortBy.split(':')
    sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
  }

  try {
    await req.user.populate({
      path: 'tasks',
      match,
      //* opcje podane tutaj definują ile i w jakim ułożeniu mają zostać zwrócone dane
      options: {
        limit: parseInt(req.query.limit),
        skip: parseInt(req.query.skip),
        sort
      }
    }).execPopulate()
    res.send(req.user.tasks)
  } catch (error) {
    res.status(500).send()
  }
})

router.get('/tasks/:id', auth, async (req, res) => {
  //* znalezienie pojedyńczego zadania po jego id i sprawdzeniu czy właściel zadania się zgadza
  const _id = req.params.id

  try {
    const foundTask = await Task.findOne({ _id, owner: req.user._id })
    if (!foundTask) {
      return res.status(404).send()
    }

    res.send(foundTask)
  } catch (error) {
    res.status(500).send()
  }
})

router.patch('/tasks/:id', auth, async (req, res) => {
  //* update istniejącego zadania

  //* sprawdzamy przychodzące w body elementy i porównujemy z tymi które isteniją w bazie, a potem używamy metody by zobaczyć czy te które przyszły znajdują się w tablicy
  const updates = Object.keys(req.body)
  const allowedUpdates = ['description', 'isCompleted']
  const isValidOperation = updates.every((item) => allowedUpdates.includes(item))

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' })
  }

  try {
    //* wyszkujemy zadanie po id podane w url i updatujemy wszystkie poddane zmienne a potem zapisujemy przez co uruchamia się też funkcja oraz po tym kto jest właścicielem
    const foundTask = await Task.findOne({ _id: req.params.id, owner: req.user._id })

    if (!foundTask) {
      res.status(404).send()
    }
    updates.forEach((updates) => {
      foundTask[updates] = req.body[updates]
    })

    await foundTask.save()
    res.send(foundTask)
  } catch (error) {
    res.status(400).send()
  }
})

router.delete('/tasks/:id', auth, async (req, res) => {
  //* usuwamy z listy zadań zadanie podane przez id i zwracamy odpowiedź
  try {
    const deletedTask = await Task.findOneAndRemove({ _id: req.params.id, owner: req.user._id })
    if (!deletedTask) {
      return res.status(404).send()
    }
    res.send(deletedTask)
  } catch (error) {
    res.status(500).send()
  }
})

module.exports = router
