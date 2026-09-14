"use client";

import { useState, useEffect } from "react";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

import type { UserRole } from "@/app/(protected)/_components/shared/common.types";
import { useIsMobile } from "@/hooks/use-mobile";

import trajettoLogo from "@/assets/logo/trajetto-logo.png";

interface NavbarContentProps {
  token: string;
  role: UserRole;
  driverId?: string;
}

const navItems: { label: string; href: string }[] = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "App", href: "/#app" },
  { label: "Sobre nós", href: "/about" },
  { label: "Contato", href: "/contact" },
  { label: "Blog", href: "/blog" },
];

const NavBarContent = ({
  role,
  token,
  driverId,
}: NavbarContentProps): JSX.Element => {
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const isMobile = useIsMobile();

  // Determine if user is a driver
  const isDriver = role === "BUSINESS_USER" && !!driverId;

  // Determine navigation href and label
  const getNavigation = () => {
    if (isDriver) return { href: "/profile", label: "Perfil" };
    if (role === "MASTER") return { href: "/admin", label: "Admin" };

    return { href: "/dashboard", label: "Dashboard" };
  };

  const navigation = getNavigation();

  // Closes the Sheet when the screen is no longer mobile
  useEffect(() => {
    if (!isMobile && isSheetOpen) {
      setIsSheetOpen(false);
    }
  }, [isMobile, isSheetOpen]);

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
              src={trajettoLogo}
              alt="Trajetto Logo"
              width={120}
              height={32}
              className="h-10 w-auto"
              placeholder="blur"
              priority
            />
            Trajetto
          </Link>
        </div>

        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col items-start">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <SheetDescription className="sr-only">
                Navegue pelas páginas do site Trajetto
              </SheetDescription>
              <Link
                href="/"
                className="font-bold text-xl 
                flex items-center"
              >
                <Image
                  src={trajettoLogo}
                  alt="Trajetto Logo"
                  width={120}
                  height={32}
                  className="h-10 w-auto"
                  placeholder="blur"
                  priority
                />
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
                      href={navigation.href}
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          className: "w-full h-full",
                        }),
                      )}
                    >
                      {navigation.label}
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
                  href={navigation.href}
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      className: "h-full",
                    }),
                  )}
                >
                  {navigation.label}
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
