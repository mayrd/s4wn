#![no_std]
#![no_main]

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

core::arch::global_asm!(include_str!("c:/Users/mayx/code/s4wn/bin-shim/test.s"));
