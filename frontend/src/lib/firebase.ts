import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export async function initFcm(): Promise<void> {
  if (!await isSupported()) return
  if (typeof window === 'undefined') return

  const app       = getApps()[0] ?? initializeApp(firebaseConfig)
  const messaging = getMessaging(app)
  const vapidKey  = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: sw })

  if (token) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({ token }),
    }).catch(console.error)
  }

  onMessage(messaging, payload => {
    new Notification(payload.notification?.title ?? 'SiMAPD', {
      body: payload.notification?.body,
      icon: '/icon-192.png',
      tag:  'violation',
    })
  })
}
