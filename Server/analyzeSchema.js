const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to analyze their schemas
const User = require('./src/models/User');
const Question = require('./src/models/Question');
const Answer = require('./src/models/Answer');
const Tag = require('./src/models/Tag');
const Vote = require('./src/models/Vote');
const Comment = require('./src/models/Comment');
const Notification = require('./src/models/Notification');
const ViewHistory = require('./src/models/ViewHistory');

// Function to analyze schema and extract field information
const analyzeSchema = (model) => {
  const schema = model.schema;
  const fields = {};
  
  schema.eachPath((pathname, schematype) => {
    // Skip internal fields
    if (pathname.startsWith('_') && pathname !== '_id') return;
    
    let fieldInfo = {
      type: schematype.constructor.name,
      required: schematype.isRequired || false,
      unique: schematype._index?.unique || false,
      ref: schematype.options?.ref || null,
      default: schematype.defaultValue,
      enum: schematype.enumValues || null,
      min: schematype.options?.min,
      max: schematype.options?.max,
      minlength: schematype.options?.minlength,
      maxlength: schematype.options?.maxlength
    };
    
    // Handle arrays
    if (schematype instanceof mongoose.Schema.Types.Array) {
      const arrayType = schematype.schema?.paths || schematype.caster;
      if (arrayType && arrayType.options?.ref) {
        fieldInfo.ref = arrayType.options.ref;
        fieldInfo.type = `[${arrayType.constructor.name}]`;
      }
    }
    
    fields[pathname] = fieldInfo;
  });
  
  return fields;
};

// Function to find relationships between models
const findRelationships = (models) => {
  const relationships = [];
  
  Object.entries(models).forEach(([modelName, model]) => {
    const fields = analyzeSchema(model);
    
    Object.entries(fields).forEach(([fieldName, fieldInfo]) => {
      if (fieldInfo.ref) {
        relationships.push({
          from: modelName,
          to: fieldInfo.ref,
          field: fieldName,
          type: fieldInfo.type.includes('[') ? 'one-to-many' : 'many-to-one',
          required: fieldInfo.required
        });
      }
    });
  });
  
  return relationships;
};

// Function to generate database statistics
const generateStats = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📊 Database Statistics & Schema Analysis\n');
    
    const models = {
      User,
      Question,
      Answer,
      Tag,
      Vote,
      Comment,
      Notification,
      ViewHistory
    };
    
    // Collection stats
    console.log('📈 Collection Statistics:');
    console.log('═══════════════════════════════════════');
    for (const [name, model] of Object.entries(models)) {
      const count = await model.countDocuments();
      const collectionName = model.collection.name;
      console.log(`${name.padEnd(15)} │ ${count.toString().padStart(4)} documents │ Collection: ${collectionName}`);
    }
    
    console.log('\n🔗 Relationship Analysis:');
    console.log('═══════════════════════════════════════');
    const relationships = findRelationships(models);
    
    relationships.forEach(rel => {
      const arrow = rel.type === 'one-to-many' ? '──▶' : '◀──';
      const reqMark = rel.required ? '(Required)' : '(Optional)';
      console.log(`${rel.from.padEnd(12)} ${arrow} ${rel.to.padEnd(12)} │ ${rel.field} ${reqMark}`);
    });
    
    console.log('\n📋 Schema Field Analysis:');
    console.log('═══════════════════════════════════════');
    
    Object.entries(models).forEach(([modelName, model]) => {
      console.log(`\n🗂️  ${modelName} Model:`);
      const fields = analyzeSchema(model);
      
      Object.entries(fields).forEach(([fieldName, fieldInfo]) => {
        let typeStr = fieldInfo.type;
        if (fieldInfo.ref) {
          typeStr += ` → ${fieldInfo.ref}`;
        }
        if (fieldInfo.enum) {
          typeStr += ` (${fieldInfo.enum.join('|')})`;
        }
        
        const attributes = [];
        if (fieldInfo.required) attributes.push('Required');
        if (fieldInfo.unique) attributes.push('Unique');
        if (fieldInfo.minlength) attributes.push(`Min:${fieldInfo.minlength}`);
        if (fieldInfo.maxlength) attributes.push(`Max:${fieldInfo.maxlength}`);
        
        const attrStr = attributes.length > 0 ? ` [${attributes.join(', ')}]` : '';
        console.log(`   ├─ ${fieldName.padEnd(20)} │ ${typeStr}${attrStr}`);
      });
    });
    
    console.log('\n🎯 Database Indexes:');
    console.log('═══════════════════════════════════════');
    
    for (const [name, model] of Object.entries(models)) {
      const indexes = model.schema.indexes();
      if (indexes.length > 0) {
        console.log(`\n📑 ${name} Indexes:`);
        indexes.forEach((index, i) => {
          const fields = Object.keys(index[0]).join(', ');
          const options = index[1] || {};
          const unique = options.unique ? ' (Unique)' : '';
          const text = options.weights ? ' (Text Search)' : '';
          console.log(`   ${i + 1}. ${fields}${unique}${text}`);
        });
      }
    }
    
    console.log('\n✅ Schema analysis completed successfully!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Connect to MongoDB and run analysis
generateStats();

module.exports = { analyzeSchema, findRelationships };
