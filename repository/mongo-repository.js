const { MongoClient, ObjectId } = require('mongodb');
const ObjectsId = require('mongodb').ObjectId;

// Connection URL
const url = 'mongodb://root:rootpwd@localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'ufcweb';

var user_collection;
var cars_collection;
var rents_collection;
async function main() {
  // Use connect method to connect to the server
  await client.connect();
  console.log('Connected successfully to Mongo server');
  const db = client.db(dbName);
  user_collection = db.collection('user');
  cars_collection = db.collection('cars');
  rents_collection = db.collection('rents');
  // the following code examples can be pasted here...
   
  return 'done.';
}

main()
  .then(console.log)
  .catch(console.error);
//   .finally(() => client.close());


//Usuários
async function getUsers(email, senha) {
    const findResult = await user_collection.find({email: email, senha: senha}).toArray();
    console.log('Found documents =>', findResult);
    return findResult;
}

async function getInfoUser(id) {
  const findResult = await user_collection.findOne({ _id: ObjectId(id) });
  console.log('Found document =>', findResult);
  return findResult;
}

async function getUsersClient(email, senha) {
  const clientUsers = await user_collection.find({ role: 'student' }).toArray();

  let findResult = null;

  clientUsers.forEach((user) => {
    if (email === user.email && senha === user.senha) {
      findResult = user;
    }
  });

  if (findResult) {
    console.log('Found user:', findResult);
  } else {
    console.log('No matching user found');
  }

  return findResult;
}

async function getUsersAdmin(email, senha) {
  const adminUsers = await user_collection.find({ role: 'admin' }).toArray();

  let findResult = null;

  adminUsers.forEach((user) => {
    if (email === user.email && senha === user.senha) {
      findResult = user;
    }
  });

  if (findResult) {
    console.log('Found user:', findResult);
  } else {
    console.log('No matching user found');
  }

  return findResult;
}

async function findUserByEmail(email) {
  const findResult = await user_collection.find({ email: email }).toArray();
  return findResult;
}


async function saveUser(user){
  const result = await user_collection.insertOne(user)
  console.log('Repository - saveUser - Inserted user')
  console.log(result)
  return result;
}

async function updateUser(userId, updatedFields) {
  console.log('updateUser - update param:');
  console.log(updatedFields);

  // Atualizar dados do usuário na tabela de usuários
  await user_collection.findOneAndUpdate(
    { _id: ObjectId(userId) },
    { $set: updatedFields }
  );

  // Atualizar os dados do usuário nos aluguéis correspondentes
  await rents_collection.updateMany(
    { idUser: userId },
    { $set: { requestedCustomer: updatedFields } }
  );

  // Verificar se o cliente possui aluguéis atualizados
  const rents = await rents_collection.find({ idUser: userId }).toArray();
  console.log('== Rent array')
  console.log(rents);
}

async function updatePassword(userId, updatedFields) {
  console.log('updatePassword - update param:');
  console.log(updatedFields);

  const { senhaAtual, senha } = updatedFields;
  console.log('== Verificando senha atual')
  
  console.log(senhaAtual)

  // Obter o usuário pelo ID
  const user = await user_collection.findOne({ _id: ObjectId(userId) });
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  // Verificar se a senha atual fornecida corresponde à senha no banco
  if (senhaAtual !== user.senha) {
    throw new Error('Senha atual incorreta');
  }

  // Atualizar a senha do usuário na tabela de usuários
  await user_collection.findOneAndUpdate(
    { _id: ObjectId(userId) },
    { $set: { senha } }
  );
}

//Aluguel Usuario
async function getRentsByUser(user) {
  console.log('getRentsByUser - Username param:', user.email)
  
  const query = { "requestedCustomer.email": user.email };
  const findResult = await rents_collection.find(query).toArray();
  console.log('Repository - getRentsByUser - Found documents =>', findResult);
  return findResult;
}

async function getRentsNOUser(user, carId) {
  console.log('getRentsNOUser - Username param:', user.email);
  
  const findResult = await rents_collection.find({
    requestedCustomer: { $ne: user._id },
    'carRented._id': { $ne: carId },
    status: 'Confirmado'
  }).sort({ dataInicio: 1 }).limit(3).toArray();
  
  console.log('Repository - getRentsNOUser - Found documents =>', findResult);
  return findResult;
}

//Carros
async function getCars() {
  console.log('getCars - Fetching all categories')
  
  const findResult = await cars_collection.find().toArray();
  console.log('Repository - getCars - Found documents =>', findResult);
  return findResult;
}

async function getCarById(id) {
  const findResult = await cars_collection.findOne({ _id: ObjectId(id) });
  console.log('Found document =>', findResult);
  return findResult;
}

async function saveCars(cars){
  const result = await cars_collection.insertOne(cars)
  console.log('Repository - saveCars - Inserted car')
  console.log(result)
  return result;
}

async function updateCar(carId, updatedFields) {
  console.log('updateCar - update param:');
  console.log(updatedFields);

  // Atualizar dados do usuário na tabela de usuários
  await cars_collection.findOneAndUpdate(
    { _id: ObjectId(carId) },
    { $set: updatedFields }
  );

  await rents_collection.updateMany(
    { idCar: carId },
    { $set: { carRented: updatedFields } }
  );

  // Verificar se o cliente possui aluguéis atualizados
  const rents = await rents_collection.find({ idCar: carId }).toArray();
  console.log('== Rent array')
  console.log(rents);
}

// async function updateUser(userId, updatedFields) {
//   console.log('updateUser - update param:');
//   console.log(updatedFields);

//   // Atualizar dados do usuário na tabela de usuários
//   await user_collection.findOneAndUpdate(
//     { _id: ObjectId(userId) },
//     { $set: updatedFields }
//   );

//   // Atualizar os dados do usuário nos aluguéis correspondentes
//   await rents_collection.updateMany(
//     { idUser: userId },
//     { $set: { requestedCustomer: updatedFields } }
//   );

//   // Verificar se o cliente possui aluguéis atualizados
//   const rents = await rents_collection.find({ idUser: userId }).toArray();
//   console.log('== Rent array')
//   console.log(rents);
// }

async function saveRentCar(cars){
  const result = await rents_collection.insertOne(cars)
  console.log('Repository - saveRentCar - Inserted car')
  console.log(result)
  return result;
}

//Admin Controller
async function getRentsAdmin() {
  
  const findResult = await rents_collection.find().toArray();
  console.log('Repository - getRentsAdmin - Found documents =>', findResult);
  return findResult;
}

async function getRentById(id) {
  const findResult = await rents_collection
    .find({ idCar: id, status: 'Confirmado' }) // Filtrar apenas os registros confirmados para o carro específico
    .sort({ dataFim: 1 }) // Ordenar por data de fim em ordem crescente
    .limit(1) // Obter apenas o primeiro documento (o mais próximo no tempo)
    .project({ dataFim: 1 }) // Incluir apenas o campo dataFim
    .toArray();

  const recentEndDate = findResult.length > 0 ? findResult[0].dataFim : null;

  console.log('Recent end date =>', findResult,recentEndDate);
  return recentEndDate;
}

// async function updateRent(rentId, novoStatus){
//   console.log('updateRent - Id param:', rentId)

//   // const findResult = await rents_collection.update().toArray();
//   rents_collection.updateOne(
//     { _id: ObjectId(rentId) }, // Use ObjectId para converter o ID em um objeto ObjectId
//     { $set: { status: novoStatus } },
//     function(err, result) {
//       if (err) {
//         console.error('Erro ao atualizar o status da reserva:', err);
//         res.status(500).json({ error: 'Erro ao atualizar o status da reserva' });
//       } else {
//         console.log('Status da reserva atualizado com sucesso');
//         res.json({ success: true });
//       }
//     }
//   );
// }

async function updateRent(rentId, novoStatus) {
  console.log('updateRent - update param:');
  console.log(novoStatus);

  // Atualizar dados do usuário na tabela de usuários
  await rents_collection.findOneAndUpdate(
    { _id: ObjectId(rentId) },
    { $set: {status: novoStatus} }
  );
}

async function deleteCar(carId) {
  const result = await cars_collection.deleteOne({ _id: ObjectId(carId) });
  console.log('Repository - deleteCar - Deleted car:', result.deletedCount);
  return result;
}

async function searchCars (searchQuery) {
  const cars = await mongoRepository.getCars();
  if (!searchQuery) {
    return cars; // Retorna todos os carros se a busca estiver vazia
  }
  const filteredCars = cars.filter(
    (car) =>
      car.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.marca.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return filteredCars;
};

//users
exports.getUsers = getUsers;
exports.getInfoUser = getInfoUser;
exports.getUsersAdmin = getUsersAdmin;
exports.getUsersClient = getUsersClient;
exports.findUserByEmail = findUserByEmail;
exports.saveUser = saveUser;
exports.updateUser = updateUser;
exports.updatePassword = updatePassword;
//rents user
exports.getRentsByUser = getRentsByUser;
exports.getRentsNOUser = getRentsNOUser;

//cars
exports.getCars = getCars;
exports.getCarById = getCarById;
exports.saveCars = saveCars;
exports.saveRentCar = saveRentCar;
exports.updateCar = updateCar;
exports.deleteCar = deleteCar;
exports.searchCars = searchCars;

//admin controller
exports.getRentsAdmin = getRentsAdmin;
exports.updateRent = updateRent;

//rent
exports.getRentById = getRentById;