const express = require('express')
const User = require('../db/models/user')
const auth = require('../middleware/auth')
const multer = require('multer')
const router = express.Router()
const sharp = require('sharp')
//* wszystkie routy od API które tyczą się użytkowników w naszym task managerze.
//* skorzystanie z biblioteki multer do określenia wielkośc nadsyłanego pliku oraz w jakim formacie jest
const upload = multer({
  limits: {
    fileSize: 1000000
  },
  fileFilter (req, file, cb) {
    if (!file.originalname.match(/.(jpg|jpeg|png)$/)) {
      return cb(new Error('Plase upload an image'))
    }

    cb(undefined, true)
  }
})

router.post('/users', async (req, res) => {
  //* stworzenie nowego użytkownika
  const user = new User(req.body)
  try {
    await user.save()
    const token = await user.generateAuthToken()
    res.status(201).send({ user, token })
  } catch (error) {
    res.status(400).send()
  }
})

router.post('/users/login', async (req, res) => {
  //* logowanie użykownika przez pobranie hasła oraz emiali i wygenerowanie tokenu.
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password)
    const token = await user.generateAuthToken()
    res.send({ user, token })
  } catch (e) {
    res.status(400).send()
  }
})

router.post('/users/logout', auth, async function (req, res) {
  //* Zabieramy listę tokenów użytkownika i używamy metody filter tak by usunąć token który aktualnie jest używany a resztę nie.
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token
    })
    await req.user.save()
    res.send()
  } catch (error) {
    res.status(500).send()
  }
})

router.post('/users/logoutAll', auth, async function (req, res) {
  //* zabieramy całą listę tokenów użytkownika i zamieniamy ją na pustą
  try {
    req.user.tokens = []
    await req.user.save()
    res.send()
  } catch (error) {
    res.status(500).send()
  }
})

//* Stowrzenie requesta do ustawiania i updatowania avataru. Sprawdzamy czy użtkownik jest zalogowany i po przesłaniu za pomocą bibloteki sharp zmieniamy zdjęcie na png i ustawiamy jego rozmiary. Następnie zabieramy buffer i dodajemy go do bazy danych

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
  req.user.avatar = buffer
  await req.user.save()
  res.send()
}, (error, req, res, next) => {
  res.status(400).send({ error: error.message })
})

router.get('/users/me', auth, async (req, res) => {
  //* pokazanie zalogowanego użykownika.
  res.send(req.user)
})

//* Ustawienie requesta dla pobierania obrazka po id tak by można wyświetlić avatar kogoś innego. Zbieramy id usera po paramie w url i sprawdzamy czy istenieje oraz czy ma awatar jeśli tak to ustawiamy header na png by przegladarka wiedziała co odbiera oraz odsyłamy avatar
router.get('/users/:id/avatar', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user || !user.avatar) {
      throw new Error()
    }

    res.set('Content-Type', 'image/png')
    res.send(user.avatar)
  } catch (e) {
    res.status(404).send()
  }
})

router.patch('/users/me', auth, async (req, res) => {
  //* pobranie listy przychodzących zmian, ustaiwenie tabeli możliwych zmian, porównanie tej tabeli oraz przychodzących zmian. Jeśli wszystko się zgadza to odszukujemy użykownika i zmieniamy go
  const updates = Object.keys(req.body)
  const allowedUpdates = ['name', 'email', 'password', 'age']
  const isValidOperation = updates.every((item) => allowedUpdates.includes(item))

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' })
  }

  try {
    updates.forEach((update) => {
      req.user[update] = req.body[update]
    })
    await req.user.save()
    res.send(req.user)
  } catch (error) {
    res.status(400).send(error)
  }
})

router.delete('/users/me', auth, async (req, res) => {
  //* Usuwamy użytkownika po id
  try {
    await req.user.remove(req.user)
    res.send(req.user)
  } catch (e) {
    res.status(500).send()
  }
})

router.delete('/users/me/avatar', auth, async (req, res) => {
  //* usuwanie awatar użytkownika który jest zalogowany
  try {
    req.user.avatar = undefined
    await req.user.save()
    res.send()
  } catch (error) {
    res.status(500).send()
  }
})

module.exports = router
