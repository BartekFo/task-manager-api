const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Task = require('./task')

//* schemat użytkownika który będzie wprowadzany by korzystać z naszej apki

const { Schema } = mongoose

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
    validate (value) {
      if (!validator.isEmail(value)) {
        throw new Error('Email is invalid')
      }
    }
  },
  age: {
    type: Number,
    default: 0,
    validate (value) {
      if (value < 0) {
        throw new Error('Age must be a postive number')
      }
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 7,
    trim: true,
    validate (value) {
      if (value.toLowerCase().includes('password')) {
        throw new Error('invalid password')
      }
    }
  },
  // token który powstaje podczas logowania
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],
  // Zapisanie danych binarnych obrazka który ma użytkownik na avatar
  avatar: {
    type: Buffer
  }
}, {
  timestamps: true
})
//* by wiedzieć wszystkie zadanie użytkownika musimy stworzyć wirtualną relacje która nie będzie nigdzie zapisana w bazie, ale kode będzie wiedział po czym odnajdować zadania i, że _id jest tym samym co owner w taskach.
userSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'owner'
})

//* metoda która jest natywnie wykorzystywana przez expressa przy czytaniu danych jako toJSON. Zmieniamy to co marobić tak by zablokować podawanie hasła w odpwiedzi na uzyskanie info o profilu oraz listy tokenów dostępu
userSchema.methods.toJSON = function () {
  const user = this
  const userObject = user.toObject()

  delete userObject.password
  delete userObject.tokens
  delete userObject.avatar

  return userObject
}

//* metoda jest używana na obiekatach stworzonych ze schematu użytkownika i uzywamy jej by generowac token który pozwoli nam na zweryfikowanie użykownika czy już jest zalogowany. Dany token przechowujemy w bazie danych

userSchema.methods.generateAuthToken = async function () {
  const user = this

  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET)

  user.tokens = user.tokens.concat({ token })
  await user.save()

  return token
}

//* statics są tworzone na modelu i akurat ta została stworzona by weryfikować użykownika po jego emialu i haśle. Z racji, że hasło jest zahaszowane to używamy metody z bcrypt by porównać hasła. Jeśli jest zwrócony błąd to wetedy wywlamy error

userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email })

  if (!user) {
    throw new Error('Unable to login')
  }
  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    throw new Error('Unable to login')
  }

  return user
}

//* hash the plain text passwrod bedfore saving
//* metoda pre na schmecie jest wykonwana wtedy gdy występuje słowo save i występuje przed zapisem. Wykorzystujemy ją do tego by zahaszować hasło bcryptem przed zapisem i wtedy używamy next by przejśc dalej bo funckja by się inaczej nigdy nie zakończyła
userSchema.pre('save', async function (next) {
  const user = this

  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10)
  }

  next()
})

//* Usuń zadania gdy użytkownik jest usuwany
userSchema.pre('remove', async function (next) {
  const user = this
  await Task.deleteMany({ owner: user._id })
  next()
})

const User = mongoose.model('User', userSchema)

module.exports = User
