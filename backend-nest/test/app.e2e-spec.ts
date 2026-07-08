import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { WsAdapter } from '@nestjs/platform-ws';

describe('SiMAPD E2E', () => {
  let app: INestApplication
  let token: string
  let personnelId: string
  let violationId: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports:[AppModule] }).compile()
    app = module.createNestApplication()
    app.useWebSocketAdapter(new WsAdapter(app))
    app.useGlobalPipes(new ValidationPipe({ whitelist:true, transform:true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /auth/login → 200 + token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username:'admin', password:'admin123' })
      .expect(200)
    expect(res.body.access_token).toBeDefined()
    token = res.body.access_token
  })

  it('GET /auth/me → 200', () =>
    request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization',`Bearer ${token}`)
      .expect(200)
  )

  it('GET /auth/me no token → 401', () =>
    request(app.getHttpServer()).get('/api/v1/auth/me').expect(401)
  )

  it('POST /personnel → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/personnel')
      .set('Authorization',`Bearer ${token}`)
      .send({ employee_id:'E2E001', full_name:'Test User', role:'Pekerja', helm_color:'Kuning', department:'Test' })
      .expect(201)
    personnelId = res.body.id
  })

  it('GET /personnel → 200 list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/personnel')
      .set('Authorization',`Bearer ${token}`)
      .expect(200)
    expect(res.body.items).toBeDefined()
    expect(res.body.total).toBeGreaterThan(0)
  })

  it('GET /violations → 200', () =>
    request(app.getHttpServer())
      .get('/api/v1/violations')
      .set('Authorization',`Bearer ${token}`)
      .expect(200)
  )

  it('GET /sp/config → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/sp/config')
      .set('Authorization',`Bearer ${token}`)
      .expect(200)
    expect(res.body.sp1_threshold).toBeDefined()
  })

  it('GET /analytics/dashboard → 200 + all fields', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Authorization',`Bearer ${token}`)
      .expect(200)
    expect(res.body.summary).toBeDefined()
    expect(res.body.trend).toBeDefined()
    expect(res.body.byType).toBeDefined()
    expect(res.body.byShift).toBeDefined()
    expect(res.body.offenders).toBeDefined()
  })

  // Cleanup
  afterAll(async () => {
    if (personnelId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/personnel/${personnelId}`)
        .set('Authorization',`Bearer ${token}`)
    }
  })
})
