"use client";

import Link from "next/link";
import Image from "next/image";

import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { UserRole } from "@/app/(protected)/_components/dto";

interface NavbarContentProps {
  token: string;
  role: UserRole;
}

const navItems: { label: string; href: string }[] = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "App", href: "/#app" },
  { label: "Sobre nós", href: "/about" },
  { label: "Contato", href: "/contact" },
  { label: "Blog", href: "/blog" },
];

const NavBarContent = ({ role, token }: NavbarContentProps): JSX.Element => {
  const NavLinks = () => (
    <NavigationMenuList>
      {navItems.map(({ label, href }) => (
        <NavigationMenuItem key={label}>
          <Link href={href} legacyBehavior passHref>
            <NavigationMenuLink className={cn(navigationMenuTriggerStyle())}>
              {label}
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      ))}
    </NavigationMenuList>
  );

  return (
    <header
      className="fixed top-0 w-full border-b bg-background/95 \
      backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50"
    >
      <div
        className="container flex h-14 
        items-center justify-between"
      >
        <div
          className="flex items-center 
          space-x-4 -ml-4 md:ml-0"
        >
          <Link
            href="/"
            className="font-bold text-xl 
            flex items-center"
          >
            <Image
              src="/trajetto-logo.png"
              alt="Trajetto Logo"
              width={120}
              height={32}
              className="h-10 w-auto"
              priority
            />
            Trajetto
          </Link>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col items-start">
              <Link href="/" className="font-bold text-xl">
                Trajetto
              </Link>
              <Separator className="mt-1" />
              <nav className="flex flex-col gap-2 w-full">
                {navItems.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className={cn(
                      buttonVariants({
                        variant: "outline",
                        className: `h-full w-full border-none
                        flex justify-start`,
                      }),
                    )}
                  >
                    {label}
                  </Link>
                ))}
                <div className="mt-4">
                  {token ? (
                    <Link
                      href={role === "MASTER" ? "/admin" : "/dashboard"}
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          className: "w-full h-full",
                        }),
                      )}
                    >
                      {role === "MASTER" ? "Admin" : "Dashboard"}
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className={cn(
                        buttonVariants({
                          className: "w-full h-full",
                        }),
                      )}
                    >
                      Login
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden md:block">
          <NavigationMenu>
            <NavLinks />
            <div className="ml-8">
              {token ? (
                <Link
                  href={role === "MASTER" ? "/admin" : "/dashboard"}
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      className: "h-full",
                    }),
                  )}
                >
                  {role === "MASTER" ? "Admin" : "Dashboard"}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({
                      className: "h-full",
                    }),
                  )}
                >
                  Login
                </Link>
              )}
            </div>
          </NavigationMenu>
        </div>
      </div>
    </header>
  );
};

export { NavBarContent };
