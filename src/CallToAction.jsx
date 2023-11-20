import { useStore } from "zustand";

const CallToAction = () => {

    const revealScene = useStore(state => state.revealScene);

    return (
        <p
            className="cta"
            onClick={() =>
                useStore.setState({ revealScene: true })
                // gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                //     { value: 1, duration: 2, ease: "power4.in" })
            }
            onTouchStart={() => {
                useStore({ revealScene: true , isMobile: true })
                useStore.setState({ isMobile: true })

                // gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                //     { value: 1, duration: 2, ease: "power4.in" })
            }}
        >Enter</p>
    );
};

export default CallToAction;