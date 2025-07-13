import { Model } from 'objection';

export class Session extends Model {
  static get tableName() {
    return 'sessions';
  }

  id!: string;
  user_id!: number;
  data!: string;
  expires_at!: Date;
  created_at!: Date;

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'user_id', 'data', 'expires_at'],
      properties: {
        id: { type: 'string', maxLength: 128 },
        user_id: { type: 'integer' },
        data: { type: 'string' },
        expires_at: { type: 'string', format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    // Lazy load to avoid circular dependencies
    const { User } = require('./User');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'sessions.user_id',
          to: 'users.id'
        }
      }
    };
  }

  $beforeInsert() {
    this.created_at = new Date();
  }
}