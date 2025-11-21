/**
 * TESTCONTAINERS - MONGODB SETUP
 * 
 * Este archivo configura TestContainers para MongoDB en las pruebas de integración.
 * TestContainers permite crear contenedores Docker temporales para tests de integración.
 * 
 * Ventajas:
 * - Usa MongoDB REAL (no simulado)
 * - Aislamiento total entre tests
 * - Reproducibilidad en dev y CI/CD
 * - Limpieza automática al terminar
 * - Versión específica de MongoDB
 * 
 * Ciclo de vida:
 * 1. beforeAll() - Inicia el contenedor MongoDB
 * 2. Tests - Se ejecutan contra MongoDB real
 * 3. afterAll() - Detiene y elimina el contenedor
 */

const { MongoDBContainer } = require('@testcontainers/mongodb');
const mongoose = require('mongoose');

let mongoContainer;

/**
 * Configura y arranca un contenedor de MongoDB para tests
 * Retorna información de conexión del contenedor
 */
async function setupMongoTestContainer() {
  console.log('\n[TestContainers] Iniciando contenedor MongoDB...');
  console.log('   Esto puede tomar 5-10 segundos la primera vez');
  
  const startTime = Date.now();
  
  try {
    if (mongoose.connection.readyState !== 0) {
      console.log('   Desconectando conexión existente...');
      await mongoose.disconnect();
    }
    
    mongoContainer = await new MongoDBContainer('mongo:7.0').start();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const containerId = mongoContainer.getId();
    const shortId = containerId.substring(0, 12);
    
    console.log(`   ✅ Contenedor iniciado en ${duration}s`);
    console.log(`   📦 Container ID: ${shortId}`);
    console.log(`   🔍 Para verificar: docker ps | grep ${shortId}`);
    
    const port = mongoContainer.getMappedPort(27017);
    const host = mongoContainer.getHost();
    const mongoUri = `mongodb://${host}:${port}/test?directConnection=true`;
    
    console.log(`   🔗 URI: ${mongoUri}`);
    
    // Esperar para que MongoDB esté listo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await mongoose.connect(mongoUri, {
      directConnection: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    console.log('   ✅ Mongoose conectado al contenedor');
    console.log(`   💡 TIPS: Abre otra terminal y ejecuta:`);
    console.log(`      → docker ps | grep mongo`);
    console.log(`      → docker logs ${shortId}\n`);
    
    return {
      uri: mongoUri,
      container: mongoContainer,
      host: host,
      port: port
    };
    
  } catch (error) {
    console.error('   Error al iniciar contenedor:', error.message);
    throw new Error(`Failed to start MongoDB TestContainer: ${error.message}`);
  }
}

/**
 * Limpia y detiene el contenedor de MongoDB
 */
async function teardownMongoTestContainer() {
  console.log('\n[TestContainers] 🧹 Limpiando...');
  
  const containerId = mongoContainer ? mongoContainer.getId().substring(0, 12) : 'N/A';
  
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('   ✅ Mongoose desconectado');
    }
    
    if (mongoContainer) {
      await mongoContainer.stop();
      console.log(`   ✅ Contenedor ${containerId} detenido y eliminado`);
      console.log('   🔍 Verifica con: docker ps -a | grep mongo');
      console.log('   ✨ Limpieza completada\n');
    }
    
  } catch (error) {
    console.error('   ❌ Error durante limpieza:', error.message);
  }
}

/**
 * Limpia todas las colecciones de la base de datos
 * Útil para ejecutar entre tests (afterEach)
 */
async function cleanupDatabase() {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = {
  setupMongoTestContainer,
  teardownMongoTestContainer,
  cleanupDatabase
};
