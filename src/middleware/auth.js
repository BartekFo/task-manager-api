const jwt = require('jsonwebtoken')
const User = require('../db/models/user')

//* funkcja auth została stworzona po to by weryfikować czy dany użytkownik jest zalogowany.

const auth = async (req, res, next) => {
  try {
    //* Próbujemy zabrać header o nazwie autoryzacja z token w nim, ale z razji, ze z porzdu występuje Bearer to za pomocą metody replace usuwamy to. Potem musimy użyć jwt by zdekodować id użytkownia zawarte w nim i używamy tokenu oraz id by znaleźć tego użytkownika w bazie. Jeśli go nie ma to rzucamy error, a jeśli jest to zapisujemy do stałych zmiennych globalnych token oraz user. Musimy też wywołać next by auth wywołało dalsze funkcje aplikacji
    const token = req.header('Authorization').replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })

    if (!user) {
      throw new Error()
    }

    req.token = token
    req.user = user
    next()
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' })
  }
}
module.exports = auth
