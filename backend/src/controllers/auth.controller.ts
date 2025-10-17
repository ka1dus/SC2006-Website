import { Request, Response } from 'express';
import { 
  registerSchema, 
  loginSchema, 
  changePasswordSchema, 
  resetPasswordSchema,
  confirmResetPasswordSchema 
} from '../schemas';
import { 
  registerUser, 
  loginUser, 
  changePassword, 
  resetPassword,
  getUserById 
} from '../services/auth.service';

// Register new user
export async function register(req: Request, res: Response) {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    const result = await registerUser(
      validatedData.name,
      validatedData.email,
      validatedData.password
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        token: result.token
      }
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
}

// Login user
export async function login(req: Request, res: Response) {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    const result = await loginUser(
      validatedData.email,
      validatedData.password
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        token: result.token
      }
    });

  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
}

// Change password
export async function changePasswordHandler(req: Request, res: Response) {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const userId = (req as any).user.id;

    await changePassword(
      userId,
      validatedData.currentPassword,
      validatedData.newPassword
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Password change failed'
    });
  }
}

// Reset password
export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    
    const tempPassword = await resetPassword(validatedData.email);

    res.json({
      success: true,
      message: 'Password reset successful. Check your email for the new password.',
      data: { tempPassword } // In production, don't return this
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Password reset failed'
    });
  }
}

// Get current user profile
export async function getProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
    return;

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get profile'
    });
    return;
  }
}

// Logout (client-side token removal)
export async function logout(req: Request, res: Response) {
  res.json({
    success: true,
    message: 'Logout successful'
  });
}
