/**
 * Credential authentication service
 * Handles email/password validation and user lookup
 */
import bcrypt from 'bcryptjs'
import { signInSchema } from '../validations/auth.schema'
import { getRepository } from '../db'
import { User } from '../db/entities/user.entity'

export async function validateCredentials(email: string, password: string) {
  try {
    const validated = signInSchema.parse({ email, password })

    const userRepo = await getRepository(User)
    const user = await userRepo.findOne({
      where: { email: validated.email },
      relations: ['employments', 'employments.store'],
    })

    if (!user || !user.isActive) {
      return null
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(validated.password, user.password)
    if (!isValidPassword) {
      return null
    }

    return user
  } catch (error) {
    console.error('Credential validation error:', error)
    return null
  }
}

export async function getUserByEmail(email: string) {
  try {
    const userRepo = await getRepository(User)
    const user = await userRepo.findOne({
      where: { email },
      relations: ['employments', 'employments.store'],
    })

    return user && user.isActive ? user : null
  } catch (error) {
    console.error('User lookup error:', error)
    return null
  }
}
