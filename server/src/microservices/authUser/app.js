const { passport, configurePassport } = require('../../config/passport');
const authRoutes = require('../../routes/authRoutes');
const userRoutes = require('../../routes/userRoutes');
const createServiceApp = require('../createServiceApp');

configurePassport();

const app = createServiceApp({
  name: 'Auth/User Service',
  routes: (serviceApp) => {
    serviceApp.use(passport.initialize());
    serviceApp.use('/api/auth', authRoutes);
    serviceApp.use('/api/users', userRoutes);
  },
});

module.exports = app;
