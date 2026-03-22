import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAaeisw_S8lFqvgYpgTEk26jVQVMBRLrQI',
  authDomain: 'dcmpa-ghg.firebaseapp.com',
  projectId: 'dcmpa-ghg',
  storageBucket: 'dcmpa-ghg.firebasestorage.app',
  messagingSenderId: '5808375679',
  appId: '1:5808375679:web:83fded948cedc0f2fc3c4a',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
