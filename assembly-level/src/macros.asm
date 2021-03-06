
; Any macros with parameters must be added both for VASM and Kowalski's.
; Note, they have slightly different syntax.


; ====================== ;
; ===== Universal ====== ;
; ====================== ;


; Controller 1
c1A     .macro
        get_bit CONTROLLER_1, 0
        sne
        .endm
c1B     .macro
        get_bit CONTROLLER_1, 1
        sne
        .endm
c1UP    .macro
        get_bit CONTROLLER_1, 2
        sne
        .endm
c1DOWN  .macro
        get_bit CONTROLLER_1, 3
        sne
        .endm
c1LEFT  .macro
        get_bit CONTROLLER_1, 4
        sne
        .endm
c1RIGHT .macro
        get_bit CONTROLLER_1, 5
        sne
        .endm
c1START .macro
        get_bit CONTROLLER_1, 6
        sne
        .endm
c1SEL   .macro
        get_bit CONTROLLER_1, 7
        sne
        .endm

; Controller 2
c2A     .macro
        get_bit CONTROLLER_2, 0
        sne
        .endm
c2B     .macro
        get_bit CONTROLLER_2, 1
        sne
        .endm
c2UP    .macro
        get_bit CONTROLLER_2, 2
        sne
        .endm
c2DOWN  .macro
        get_bit CONTROLLER_2, 3
        sne
        .endm
c2LEFT  .macro
        get_bit CONTROLLER_2, 4
        sne
        .endm
c2RIGHT .macro
        get_bit CONTROLLER_2, 5
        sne
        .endm
c2START .macro
        get_bit CONTROLLER_2, 6
        sne
        .endm
c2SEL   .macro
        get_bit CONTROLLER_2, 7
        sne
        .endm


; ====================== ;
; ===== Kowalski's ===== ;
; ====================== ;
        .if __KOWALSKI__
; ====================== ;

; ===== Missing from Kowalski's ===== ;

; stop
stp     .macro
        .byte $db
        .endm

; wait for interrupt
wai     .macro
        .byte $cb
        .endm

; ===== General ===== ;

; copy byte at src to dst
cp8     .macro src, dst
        lda src
        sta dst
        .endm

; copy word at src to dst
cp16    .macro src, dst
        cp8 src+1, dst+1 ; copy LSB
        cp8 src, dst     ; COPY MSB
        .endm

; swap bytes at t1 and t2
swp8    .macro t1, t2
        lda t1
        pha             ; stack.push( t1 )
        lda t2
        sta t1          ; t1 <= t2
        pla
        sta t2          ; t2 <= stack.pull()
        .endm

; swap words at t1 and t2
swp16   .macro t1, t2
        swp8P t1+1, t2+1
        swp8P t1, t2
        .endm

; increment memory with length
inc_mem .macro address, length
        .if length < 1          ; ensure input is valid
        .error "Bad memory size in inc_mem"
        .endif

.i      .set 0

        .repeat length-1        ; -------------------------------------- ;
        inc address+.i
        bne .end_inc            ; increment next if overflow occurred
.i      .set .i+1
        .endr                   ; -------------------------------------- ;

        inc address+.i

.end_inc:
        .endm

; load label16 into dst16
ldlab16 .macro label16, dst16
        lda #<label16
        sta dst16
        lda #>label16
        sta dst16+1
        .endm

; isolate "bit_i"th bit of "input"
get_bit .macro input, bit_i
.mask .set 1 << bit_i
        lda #.mask
        and input
        .endm

; Set A to A != 0
sne     .macro
        beq .exit       ; if 0, exit
        lda #1
.exit
        .endm

; Set A to A == 0
seq     .macro
        sne
        eor #1
        .endm



; ====================== ;
        .endif
; ====================== ;
; ======== VASM ======== ;
; ====================== ;
        .if __VASM__
; ====================== ;

; ===== General ===== ;

; copy byte at src to dst
cp8     .macro src, dst
        lda \src
        sta \dst
        .endm

; copy word at src to dst
cp16    .macro src, dst
        cp8 \src+1, \dst+1    ; copy LSB
        cp8 \src, \dst        ; COPY MSB
        .endm

; swap bytes at t1 and t2
swp8    .macro t1, t2
        lda \t1
        pha             ; stack.push( t1 )
        lda \t2
        sta \t1         ; t1 <= t2
        pla
        sta \t2         ; t2 <= stack.pull()
        .endm

; swap words at t1 and t2
swp16   .macro t1, t2
        swp8 \t1+1, \t2+1
        swp8 \t1, \t2
        .endm

; increment memory with specified size
inc_mem .macro address, length
        .if \length < 1         ; ensure input is valid
        .error "Bad memory size in inc_mem"
        .endif

.endinc .set .endinc\@
.address .set \address
.i      .set 0

        .repeat \length-1       ; -------------------------------------- ;
        inc .address+.i
        bne .endinc             ; increment next if overflow occurred
.i      .set .i+1
        .endr                   ; -------------------------------------- ;

        inc .address+.i

.endinc\@:
        .endm

; load label16 into dst16
ldlab16 .macro label16, dst16
.label16\@ .set \label16
        lda #<.label16\@
        sta \dst16
        lda #>.label16\@
        sta \dst16+1
        .endm

; isolate "bit_i"th bit of "input"
get_bit .macro input, bit_i
.mask\@ .set 1 << \bit_i
        lda #.mask\@
        and \input
        .endm

; Set A to 1 iff A != 0
sne     .macro
        beq .exit\@     ; if 0, exit
        lda #1
.exit\@
        .endm

; Set A to 1 iff A == 0
seq     .macro
        sne
        eor #1
        .endm


; ====================== ;
        .endif
