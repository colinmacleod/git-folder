import { Model } from 'objection';
import Knex from 'knex';
import knexConfig from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment as keyof typeof knexConfig];

if (!config) {
  throw new Error(`No knex configuration found for environment: ${environment}`);
}

const knex = Knex(config);

// Initialize Objection with the knex instance
Model.knex(knex);

export default knex;