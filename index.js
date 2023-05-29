const express = require('express')
const flash = require('connect-flash');
const ejs = require('ejs');
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

app.use(flash())
app.use(function(req, res, next){
    res.locals.message = req.flash();
    next();
});

app.get('/display-message', (req, res) => {
    res.render("template/display",{ message: 'Tudo certo'});
});

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
  res.render('admin/admin', {message: ''})
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
    } else next();
  } else next();
});

app.use(express.static('public'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const mongoRepository = require('./repository/mongo-repository')

app.get('/signin', (req, res) => {
  res.render('signin', {message: ''})
})

app.post('/signin', (req, res) => {
  console.log('post - /login')
  console.log(req.body)
  mongoRepository.getUsersClient(req.body.email, req.body.senha).then(users => {
    if (users){
      req.session.user = users
      res.redirect('/loja')
      return 
    } else {
      res.render('signin', { message: 'email ou senha inválido' })
    }
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
    } else {
      res.render('admin/admin', { message: 'email ou senha inválido' })
    }
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
      const fs = require('fs');
      const templatePath = 'views/template/mail.ejs';
      const template = fs.readFileSync(templatePath, 'utf-8');
      
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
      
      // Renderizar o template com os dados do usuário
      const renderedTemplate = ejs.render(template, { user: user });
      
      // Salvar o usuário no banco de dados
      mongoRepository.saveUser(user)
        .then( async (insertedUser) => {
          console.log('=========== Email cadastrado ', user.email)
          const info = await transporter.sendMail({
            from: 'luan.saboia@gmail.com',
            to: user.email,
            subject: 'Seu cadastro na Alucar',
            html: renderedTemplate
            // text: 'Olá, este é um exemplo de e-mail enviado com o Ethereal Email!',
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

app.use('/client/*',(req, res, next) => {
  console.log('== Student Area Middleware')
  console.log(req.session)
  if(req.session.user.role == 'client'){
    next()
  }
  else res.redirect('/signin')
})

let findCars = null
app.get('/loja', async (req,res) => {
  mongoRepository.getCars().then((cars) => {
    res.render('client/loja', { cars: cars, user: req.session.user });
  });
})

app.post('/loja', (req, res) => {
  const value = req.body.buscaCarro; // Obter o valor do input

  findCars = mongoRepository.findCarByNomeOuMarca(value).then((cars) => {
    // Fazer algo com o resultado da busca (o array de carros)
    console.log('Resultado da busca:', cars);
    res.render('client/loja', { cars, user: req.session.user }); // Exemplo: renderizar a página "loja" com o array de carros
  }).catch((error) => {
    console.error('Erro na busca:', error);
    res.status(500).send('Erro na busca de carros.'); // Exemplo: enviar uma resposta de erro
  });
});

app.get('/loja/conta',(req,res) => {
  mongoRepository.getInfoUser(req.session.user._id).then((user) => {
    res.render('client/conta', { user: user });
  });
})

app.get('/loja/conta-editar/:id',(req,res) => {
  mongoRepository.getInfoUser(req.session.user._id).then((user) => {
    res.render('client/conta-editar', { user: user });
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
    res.render('client/conta-senha', { user: user, message: '' });
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
      res.status(400).send('Senha atual está incorreta');
    });
});


var carById  = null
app.get('/loja/alugar', async (req,res) => {
  carById = await mongoRepository.getCarById(req.query.carId);
  console.log('===================== Carro Id: ', carById);

  const user = req.session.user;
  const reservas = await mongoRepository.getRentsNOUser(user, carById._id);

  res.render('client/alugar', { user: user, reservas: reservas, cars: carById});
})

const moment = require('moment')
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
    res.render('client/aluguel', { user: req.session.user, reservas: reservas });
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
    res.redirect('/admin/loja');
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
