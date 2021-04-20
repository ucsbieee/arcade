
; This is the main file for assembly. Run all assembly code through this file.
; > Set your tool in "options.asm"
; > Set the src for your rom in "rom.asm"

; ====== options ====== ;
        .include "options.asm"

        .if __VASM__ && __KOWALSKI__
        .error "Cannot select both Vasm and Kowalski"
        .endif
        .if !__VASM__ && !__KOWALSKI__
        .error "Must select either Vasm or Kowalski"
        .endif

        ; VASM settings
        .if __VASM__
        .org 0          ; make vasm show all of address space
        .endif

        ; Kowalski settings
        .if __KOWALSKI__
        .opt Proc65c02, SwapBin ; % now becomes binary radix and @ becomes modulo
        .endif

; ====== labels ====== ;
        .include "macros.asm"
        .include "labels.asm"

; ====== firmware ====== ;
        .org _FIRMWARE_START

        ; Kowalski entry point
        .if __KOWALSKI__
        jmp _ROM_START
        .endif

        .include "subroutines/add.asm"
        .include "subroutines/subtract.asm"
        .include "subroutines/multiply.asm"
        .include "subroutines/divide.asm"

; ====== ROM ====== ;
        .org _ROM_START
        .include "rom.asm"

        ; set 65c02 entry point
        .org $fffc
        .word _ROM_START
        .word 0
