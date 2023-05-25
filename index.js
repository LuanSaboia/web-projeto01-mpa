const express = require('express')
var cookieSession = require('cookie-session')
const app = express()
const port = 3000
const nodemailer = require('nodemailer');

// Configuração do transporte de e-mail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'luan.saboia@gmail.com',
    pass: 'rmkxhabgmklvwdhh',
  },
});

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(cookieSession({
  name: 'ufc-web-session',
  secret: 'your secret here',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

app.get('/logout', (req, res) => {
  req.session = null
  res.redirect('/')
})

// app.get('/', (req, res) => {
//   mongoRepository.getCars().then((cars) => {
//     res.render('index', { cars: cars });
//   });
// })

app.get('/', async (req, res) => {
  const currentDate = new Date(); // Obter a data atual

  const cars = await mongoRepository.getCars();
  const agendamentos = await mongoRepository.getRentsAdmin();

  const carsWithAvailability = cars.map((car) => {
    let isAvailable = true; // Definir como disponível por padrão
    let proxData = null;
  
    // Verificar se há algum registro confirmado correspondente ao carro e às datas atuais
    const confirmedAgendamento = agendamentos.find((agendamento) => {
      const startDate = new Date(agendamento.dataInicio).toISOString();
      const endDate = new Date(agendamento.dataFim).toISOString();
  
      return (
        agendamento.idCar === car._id.toString() &&
        agendamento.status === 'Confirmado' &&
        currentDate.toISOString() >= startDate &&
        currentDate.toISOString() <= endDate
      );
    });

    let nextAvailable = null;
    for (const agendamento of agendamentos) {
      const startDate = new Date(agendamento.dataInicio).toISOString();
      const endDate = new Date(agendamento.dataFim).toISOString();

      if (
        agendamento.idCar === car._id.toString() &&
        agendamento.status === 'Confirmado' &&
        currentDate.toISOString() >= startDate &&
        currentDate.toISOString() <= endDate
      ) {
        nextAvailable = agendamento.dataFim;
        console.log('===========', typeof nextAvailable)

        break; // Encontrou a primeira data disponível, encerra o loop
      }
    }

  
    if (confirmedAgendamento) {
      isAvailable = false; // Atualizar para indisponível se houver registro confirmado
    }
  
    return {
      ...car,
      isAvailable,
      nextAvailable
    };
  });
  res.render('index', { cars: carsWithAvailability });
});



app.get('/signup', (req, res) => {
  res.render('signup')
})

app.get('/admin', (req, res) => {
  res.render('admin/admin')
})

app.use((req, res, next) => {
  console.log('== Session Log Middleware');
  console.log(req.session);
  next();
});

app.use((req, res, next) => {
  console.log('== Root Middleware');
  if(req.path == '/'){
    if(req.session.user){
      console.log('Go home')
      res.redirect('/home')
    } else next();
  } else next();
});

app.use(express.static('public'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const mongoRepository = require('./repository/mongo-repository')

app.get('/signin', (req, res) => {
  res.render('signin', {error: null})
})

app.post('/login', (req, res) => {
  console.log('post - /login')
  console.log(req.body)
  mongoRepository.getUsersClient(req.body.email, req.body.senha).then(users => {
    if (users){
      req.session.user = users
      res.redirect('/loja')
      return 
    } else res.redirect('/')
  });
})


app.post('/admin', (req, res) => {
  console.log('post - /login')
  console.log(req.body)
  mongoRepository.getUsersAdmin(req.body.email, req.body.senha).then(users => {
    if (users){
      req.session.user = users
      res.redirect('/admin/loja')
      return 
    } else res.redirect('/')
  });
})

app.post('/signup', (req, res) => {
  console.log('post - /signup')
  console.log(req.body)
  const { nome, dtNascimento, genero, telefone, email, senha } = req.body;

  mongoRepository.findUserByEmail(email).then((users) => {
    if(users.length > 0){
      res.status(400).send('O email já está cadastrado. Por favor, utilize outro email.');
    }  else {
      // Criação do objeto de usuário
      const user = {
        nome,
        dtNascimento,
        genero,
        telefone,
        email,
        senha,
        role: 'client'
      };

      // Salvar o usuário no banco de dados
      mongoRepository.saveUser(user)
        .then( async (insertedUser) => {
          console.log('=========== Email cadastrado ', user.email)
          const info = await transporter.sendMail({
            from: 'luan.saboia@gmail.com',
            to: user.email,
            subject: 'Seu cadastro na Alucar',
            text: 'Olá, este é um exemplo de e-mail enviado com o Ethereal Email!',
          });
          // Usuário cadastrado com sucesso, redirecionar para a página de login
          res.redirect('/loja');
        })
        .catch((error) => {
          // Ocorreu um erro ao salvar o usuário, retornar uma mensagem de erro ou redirecionar para uma página de erro
          res.status(500).send('Ocorreu um erro ao cadastrar o usuário. Por favor, tente novamente mais tarde.');
        });
    }
  })
})

app.use((req, res, next) => {
  console.log('== Auth Middleware')
  console.log(req.session)
  if(req.session.user){
    next()
  }
  else res.redirect('/')

})

app.get('/home',(req,res) => {
  res.render('home', {user: req.session.user})
})

app.use('/student/*',(req, res, next) => {
  console.log('== Student Area Middleware')
  console.log(req.session)
  if(req.session.user.role == 'student'){
    next()
  }
  else res.redirect('/signin')
})

app.get('/student/home',(req,res) => {
  res.render('student/home', {user: req.session.user})
})

app.get('/loja', async (req,res) => {
  mongoRepository.getCars().then((cars) => {
    res.render('student/loja', { cars: cars, user: req.session.user });
  });
})

app.get('/loja/conta',(req,res) => {
  mongoRepository.getInfoUser(req.session.user._id).then((user) => {
    res.render('student/conta', { user: user });
  });
})

app.get('/loja/conta-editar/:id',(req,res) => {
  mongoRepository.getInfoUser(req.session.user._id).then((user) => {
    res.render('student/conta-editar', { user: user });
  });
})

app.post('/loja/conta-editar/:id', (req, res) => {
  let userId = req.params.id; // Captura o ID do usuário da URL
  let userUpdate = req.body;
  console.log('== Conta Editar');
  console.log(userUpdate);
  mongoRepository.updateUser(userId, userUpdate).then(() => {
    res.redirect('/loja/conta');
  });
});

app.get('/loja/conta-senha/:id',(req,res) => {
  mongoRepository.getInfoUser(req.session.user._id).then((user) => {
    res.render('student/conta-senha', { user: user });
  });
})

app.post('/loja/conta-senha/:id', (req, res) => {
  const userId = req.params.id; // Captura o ID do usuário da URL
  const { senhaAtual, senha } = req.body;

  const userUpdate = {
    senhaAtual,
    senha
  };

  console.log('== Conta senha');
  console.log(userUpdate);

  mongoRepository.updatePassword(userId, userUpdate)
    .then(() => {
      res.redirect('/loja/conta');
    })
    .catch((error) => {
      console.log(error);
      res.redirect('/loja/conta'); // Redirecionar para a página de conta com uma mensagem de erro, se necessário
    });
});


var carById  = null
app.get('/loja/alugar', async (req,res) => {
  carById = await mongoRepository.getCarById(req.query.carId);
  console.log(carById);

  const user = req.session.user;
  const reservas = await mongoRepository.getRentsNOUser(user, req.query.carId);

  res.render('student/alugar', { user: user, reservas: reservas, cars: carById});
})

app.get('/getRentsNOUser', async (req, res) => {
  const userId = req.query.userId;
  const carId = req.query.carId;
  const reservas = await mongoRepository.getRentsNOUser(userId, carId);
  res.json(reservas);
});


app.post('/loja/alugar',(req,res) => {
  console.log('POST - /loja/alugar')
  let reserva = req.body;
  reserva.status = 'Aguardando Confirmação'
  reserva.carRented = carById;
  reserva.requestedCustomer = req.session.user;
  console.log(reserva)

  mongoRepository.saveRentCar(reserva).then((insertedRent) => {
    console.log('Rent')
    console.log(insertedRent)
    res.redirect('/loja/aluguel')
  })
})

app.get('/loja/aluguel', async (req,res) => {
  mongoRepository.getRentsByUser(req.session.user).then((reservas) => {
    res.render('student/aluguel', { user: req.session.user, reservas: reservas });
  })
})

app.use('/admin/*',(req, res, next) => {
  console.log('== Admin Area Middleware')
  console.log(req.session)
  if(req.session.user.role == 'admin'){
    next()
  }
  else res.redirect('/')
})

app.get('/admin/home',(req,res) => {
  res.render('admin/home', {user: req.session.user})
})

app.get('/admin/loja',(req,res) => {
  mongoRepository.getCars().then((cars) => {
    res.render('admin/loja', { cars: cars, user: req.session.user });
  });
})

app.get('/admin/loja/add-carro',(req,res) => {
  res.render('admin/loja/add-carro', {user: req.session.user})
})

app.post('/admin/loja/add-carro', (req, res) => {
  console.log('POST - /admin/loja/add-carro')
  let cars = req.body;
  cars.valor = parseFloat(cars.valor)
  cars.precoDiaria = parseFloat(cars.precoDiaria)
  console.log(cars)
  mongoRepository.saveCars(req.body).then((insertedCar) => {
    console.log('Inserted Product')
    console.log(insertedCar)
    res.redirect('/admin/loja')
  })
})

app.get('/admin/loja/editar-carro', async (req,res) => {
  const cars = await mongoRepository.getCarById(req.query.carId);
  res.render('admin/loja/editar-carro', {user: req.session.user, cars: cars})
})

app.post('/admin/loja/editar-carro/:id', (req, res) => {
  let carId = req.params.id; // Captura o ID do usuário da URL
  let userUpdate = req.body;
  console.log('== Conta Editar');
  console.log(userUpdate);
  mongoRepository.updateCar(carId, userUpdate).then(() => {
    res.redirect('/loja/conta');
  });
})

app.post('/admin/loja/remover-carro/:id', (req, res) => {
  let carId = req.params.id;

  mongoRepository.deleteCar(carId).then(() => {
    console.log('Deleted Car:', carId);
    res.redirect('/admin/loja');
  });
});

// let rentId
// let novoStatus
app.get('/admin/aluguel', async (req,res) => {
  mongoRepository.getRentsAdmin(req.session.user).then((reservas) => {
    res.render('admin/aluguel', { user: req.session.user, reservas: reservas });
  })
})

app.post('/admin/aluguel', async (req,res) => {
  let rentId
  let novoStatus
  if(req.query.aceitar){
    rentId = req.query.aceitar
    novoStatus = 'Confirmado'
  } else if(req.query.rejeitar){
    rentId = req.query.rejeitar
    novoStatus = 'Rejeitado'
  }
  console.log(rentId)
  console.log(novoStatus)
  mongoRepository.updateRent(rentId, novoStatus).then(() => {
    console.log('Update rent')
    console.log(rentId, ' ', novoStatus)
    res.redirect('/admin/aluguel')
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
