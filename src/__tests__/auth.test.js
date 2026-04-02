const request = require('supertest');
const app = require('../../app');

describe('Auth Endpoints', () => {
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    userType: 'helper',
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('status', 'success');
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data.user).toHaveProperty('email', 'test@example.com');
        });

        it('should fail with invalid email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    name: 'Test User',
                    email: 'invalid-email',
                    password: 'password123',
                });

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login user with valid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('status', 'success');
            expect(res.body.data).toHaveProperty('token');
        });
    });
});
