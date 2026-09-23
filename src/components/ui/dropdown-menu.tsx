"use client"

// Menu aksi "⋯" — komponen shadcn, disalin seperti sidebar dan tooltip
// (keputusan 5 di 06-architecture.md). Hanya bagian yang dipakai layar ini:
// akar, pemicu, isi, butir, dan pemisah.
//
// DS-31 — tokennya dialiaskan ke palet bagian 2, bukan warna bawaan shadcn,
// dan tinggi butirnya dinaikkan ke 44px (DS-11). Teks pembaca layar
// diterjemahkan.
//
// Tiap butir di sini TAUTAN, bukan tombol form: Radix melepas menunya dari
// DOM begitu sebuah butir dipilih, dan form yang ikut terlepas di tengah
// pengirimannya adalah balapan yang tidak perlu ada. Aksinya hidup di dialog
// yang dibuka tautan itu (DS-56).

import * as React from "react"
import { cn } from "cn"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

function DropdownMenu(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>,
) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) {
  return (
    <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "end",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-md border border-border bg-background p-1 shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  bahaya,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  /** Aksi yang menghilangkan sesuatu — merah, dan selalu di bawah pemisah. */
  bahaya?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        // DS-11 — 44px, sama seperti butir menu di sidebar.
        "flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-sm px-3 text-app-body outline-hidden",
        "focus:bg-muted data-[highlighted]:bg-muted",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        bahaya && "text-danger-foreground focus:bg-danger-surface data-[highlighted]:bg-danger-surface",
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}
