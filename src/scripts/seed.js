import { initDatabase, query, run } from '../database/init.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  console.log('Inicializando base de datos...');
  initDatabase();

  // Esperar un poco para que se cree la base de datos
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // Crear usuario de ejemplo si no existe
    const existingUsers = await query('SELECT * FROM users WHERE email = ?', ['propietario@example.com']);
    
    let userId;
    if (existingUsers.length === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userResult = await run(
        'INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
        ['propietario@example.com', hashedPassword, 'Juan', 'Pérez', 'user']
      );
      userId = userResult.lastID;
      console.log('✓ Usuario creado: propietario@example.com / password123');
    } else {
      userId = existingUsers[0].id;
      console.log('✓ Usuario ya existe: propietario@example.com');
    }

    // Verificar si ya hay propiedades
    const existingProps = await query('SELECT COUNT(*) as count FROM properties');
    if (existingProps[0].count > 0) {
      console.log('⚠ Ya existen propiedades en la base de datos.');
      console.log('   Si quieres volver a cargar, elimina la base de datos (database.sqlite) primero.');
      return;
    }

    // Propiedades de ejemplo
    const properties = [
      {
        title: 'Casa Moderna en Nueva Córdoba',
        description: 'Hermosa casa moderna ubicada en el corazón de Nueva Córdoba. A pocas cuadras de la universidad y de los mejores bares y restaurantes. Completamente equipada con todas las comodidades.',
        location: 'Nueva Córdoba, Córdoba',
        price_per_night: 15000,
        capacity: 4,
        cover_image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'
        ]),
        amenities: JSON.stringify(['Wifi', 'Aire acondicionado', 'Cocina', 'Estacionamiento']),
        owner_email: 'propietario@example.com'
      },
      {
        title: 'Loft Minimalista en Güemes',
        description: 'Loft luminoso y espacioso en el barrio bohemio de Güemes. Perfecto para parejas o viajeros que buscan una experiencia única. Decoración moderna y minimalista.',
        location: 'Güemes, Córdoba',
        price_per_night: 12000,
        capacity: 2,
        cover_image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
        ]),
        amenities: JSON.stringify(['Wifi', 'Aire acondicionado', 'Cocina']),
        owner_email: 'propietario@example.com'
      },
      {
        title: 'Departamento con Vista al Río',
        description: 'Departamento amplio con vista panorámica al río Suquía. Ubicado en zona tranquila pero cerca del centro. Ideal para familias o grupos pequeños.',
        location: 'Centro, Córdoba',
        price_per_night: 18000,
        capacity: 6,
        cover_image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
          'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=800'
        ]),
        amenities: JSON.stringify(['Wifi', 'Aire acondicionado', 'Cocina', 'Vistas al Río', 'Estacionamiento']),
        owner_email: 'propietario@example.com'
      },
      {
        title: 'Casa con Piscina en Villa Allende',
        description: 'Casa amplia con piscina y jardín. Perfecta para disfrutar del verano cordobés. Zona residencial tranquila, ideal para descansar.',
        location: 'Villa Allende, Córdoba',
        price_per_night: 25000,
        capacity: 8,
        cover_image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
          'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800'
        ]),
        amenities: JSON.stringify(['Wifi', 'Aire acondicionado', 'Cocina', 'Piscina', 'Estacionamiento', 'Jardín']),
        owner_email: 'propietario@example.com'
      },
      {
        title: 'Estudio en Zona Norte',
        description: 'Estudio compacto y funcional en zona norte de Córdoba. Perfecto para estadías cortas. Bien comunicado con transporte público.',
        location: 'Zona Norte, Córdoba',
        price_per_night: 8000,
        capacity: 2,
        cover_image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'
        ]),
        amenities: JSON.stringify(['Wifi', 'Aire acondicionado']),
        owner_email: 'propietario@example.com'
      }
    ];

    console.log('\nCargando propiedades...');
    
    for (const prop of properties) {
      await run(
        `INSERT INTO properties 
         (title, description, location, price_per_night, capacity, cover_image, images, amenities, owner_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prop.title,
          prop.description,
          prop.location,
          prop.price_per_night,
          prop.capacity,
          prop.cover_image,
          prop.images,
          prop.amenities,
          prop.owner_email
        ]
      );
      console.log(`✓ Propiedad creada: ${prop.title}`);
    }

    console.log('\n✅ Datos de ejemplo cargados exitosamente!');
    console.log('\nUsuarios disponibles:');
    console.log('  - Admin: admin@example.com / admin123');
    console.log('  - Propietario: propietario@example.com / password123');
    console.log('\nPuedes iniciar sesión y ver las propiedades en el panel.');

  } catch (error) {
    console.error('Error cargando datos:', error);
  }

  // Cerrar conexión
  process.exit(0);
};

seedData();


