const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");

const usernameDom = document.getElementById("user-name");
const chatDom = document.getElementById("chat");

const usernameInput = document.getElementById("username-input");
const usernameButton = document.getElementById("username-button");

const chatInput = document.getElementById("chat-input");
const chatButton = document.getElementById("chat-button");

const config = {
    iceServers: [
        {
            urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
            ],
        },
    ],
};

let username;
let chat;

let localStream;
let remoteStream;

let peerConnection = new RTCPeerConnection(config);

let socket = io("/", {
    auth: {
        username,
    },
});

let iceCandidates = [];

socket.emit("join-room", username);

peerConnection.ontrack = (event) => {
    console.log(event);
    try {
        if (event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    } catch (error) {
        console.error(error);
    }
};

socket.on("new-call", (msg) => {
    const answerButton = document.createElement("button");
    answerButton.innerHTML = "Answer";
    answerButton.onclick = () => answer(msg);

    document.body.appendChild(answerButton);
});

socket.on("new-answer", async (msg) => {
    const desc = new RTCSessionDescription(msg.sdp);
    await peerConnection.setRemoteDescription(desc);
});

socket.on("new-icecandidate", async (msg) => {
    try {
        if (msg.candidate) {
            await peerConnection.addIceCandidate(msg.candidate);
        }
    } catch (error) {
        console.error(error);
        iceCandidates.push(msg.candidate);
    }
});

usernameButton.addEventListener("click", () => {
    username = usernameInput.value;
    usernameDom.innerHTML = "User: " + username;
    socket.emit("join-room", username);
});

chatButton.addEventListener("click", () => {
    chat = chatInput.value;
    chatDom.innerHTML = "Chat: " + chat;
});

async function call() {
    let stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });

    peerConnection = new RTCPeerConnection(config);

    localStream = stream;
    localVideo.srcObject = stream;
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    peerConnection.onicecandidate = async (event) => {
        try {
            if (event.candidate) {
                socket.emit("icecandidate", {
                    from: username,
                    to: chat,
                    type: "ice-candidate",
                    candidate: event.candidate,
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    peerConnection.ontrack = (event) => {
        console.log(event);
        try {
            if (event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
            }
        } catch (error) {
            console.error(error);
        }
    };

    socket.emit("call", {
        from: username,
        to: chat,
        type: "offer",
        sdp: peerConnection.localDescription,
    });
}

async function answer(msg) {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });

    localStream = stream;
    localVideo.srcObject = stream;
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    const desc = new RTCSessionDescription(msg.sdp);
    await peerConnection.setRemoteDescription(desc);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    iceCandidates.forEach(async (candidate) => {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error(error);
        }
    });

    peerConnection.onicecandidate = async (event) => {
        try {
            if (event.candidate) {
                socket.emit("icecandidate", {
                    from: username,
                    to: msg.from,
                    type: "ice-candidate",
                    candidate: event.candidate,
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    socket.emit("answer", {
        from: username,
        to: msg.from,
        type: "answer",
        sdp: peerConnection.localDescription,
    });
}
