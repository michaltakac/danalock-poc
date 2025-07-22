'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Settings, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="font-bold text-xl">Danalock Manager</div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-4 text-sm">
            <Link href="/">
              <Button 
                variant={pathname === '/' ? 'secondary' : 'ghost'} 
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Locks
              </Button>
            </Link>
            
            <Link href="/settings">
              <Button 
                variant={pathname === '/settings' ? 'secondary' : 'ghost'} 
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <div className="flex md:hidden items-center space-x-2">
            <Link href="/">
              <Button 
                variant={pathname === '/' ? 'secondary' : 'ghost'} 
                size="icon"
                aria-label="Locks"
              >
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            
            <Link href="/settings">
              <Button 
                variant={pathname === '/settings' ? 'secondary' : 'ghost'} 
                size="icon"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}