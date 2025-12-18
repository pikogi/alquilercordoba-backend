import bcrypt from 'bcryptjs';
import { query, run } from '../database/init.js';
import dotenv from 'dotenv';

dotenv.config();

const fixAdmin = async () => {
  console.log('Corrigiendo contraseña del usuario admin...');
  
  try {
    // Generar hash correcto para "Admin4349!"
    const correctHash = await bcrypt.hash('Admin4349!', 10);
    
    // Verificar si el usuario existe
    const users = await query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
    
    if (users.length === 0) {
      // Crear el usuario admin si no existe
      const result = await run(
        'INSERT INTO users (email, password, first_name, role) VALUES (?, ?, ?, ?)',
        ['admin@example.com', correctHash, 'Admin', 'admin']
      );
      console.log('✓ Usuario admin creado');
    } else {
      // Actualizar la contraseña
      await run(
        'UPDATE users SET password = ? WHERE email = ?',
        [correctHash, 'admin@example.com']
      );
      console.log('✓ Contraseña del admin actualizada');
    }
    
    console.log('\n✅ Usuario admin corregido!');
    console.log('Email: admin@example.com');
    console.log('Password: Admin4349!');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
};

fixAdmin();



