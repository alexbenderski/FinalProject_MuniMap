"use client";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const observeUser = (cb: (u: User | null) => void) =>
  onAuthStateChanged(auth, cb);

export const logOut = () => signOut(auth);
