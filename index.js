let socket;
let username;
let chat;

let myPeerConnection;

let localStream;
let remoteStream;

const mediaConstraints = {
    video: true,
    audio: true,
};

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

function init(username) {
    socket = io("/", {
        auth: {
            username,
        },
    });

    socket.emit("join-room", username);

    socket.on("call", ({ from, sdp }) => {
        const answerButton = document.createElement("button");
        answerButton.innerHTML = "Answer";
        answerButton.onclick = () => answer({ from, sdp });

        document.body.appendChild(answerButton);
    });

    socket.on("answer", async ({ from, to, type, sdp }) => {
        const desc = new RTCSessionDescription(sdp);

        await myPeerConnection.setRemoteDescription(desc);
    });

    socket.on("new-ice-candidate", handleNewIceCandidate);

    document.getElementById("user-name").innerHTML = "User: " + username;
}

init(Math.floor(Math.random() * 1000));

const usernameInput = document.getElementById("username-input");
const usernameButton = document.getElementById("username-button");

usernameButton.addEventListener("click", () => {
    init(usernameInput.value);
    username = usernameInput.value;
    usernameInput.value = "";
});

const chatInput = document.getElementById("chat-input");
const chatButton = document.getElementById("chat-button");

chatButton.addEventListener("click", () => {
    chat = chatInput.value;
    chatInput.value = "";
    document.getElementById("chat").innerHTML = "Chat: " + chat;
});

async function call() {
    createPeerConnection();
    navigator.mediaDevices.getUserMedia(mediaConstraints).then((stream) => {
        document.getElementById("local-video").srcObject = stream;
        localStream = stream;
        localStream.getTracks().forEach((track) => {
            myPeerConnection.addTrack(track, localStream);
        });
    });
    await onNegotiationNeeded();
}

async function answer(message) {
    createPeerConnection();
    chat = message.from;

    const desc = new RTCSessionDescription(message.sdp);
    await myPeerConnection.setRemoteDescription(desc);

    navigator.mediaDevices.getUserMedia(mediaConstraints).then((stream) => {
        document.getElementById("local-video").srcObject = stream;
        localStream = stream;
        localStream.getTracks().forEach((track) => {
            myPeerConnection.addTrack(track, localStream);
        });
    });

    myPeerConnection.ontrack = (event) => {
        document.getElementById("remote-video").srcObject = event.streams[0];
    };

    const answer = await myPeerConnection.createAnswer();
    await myPeerConnection.setLocalDescription(answer);

    socket.emit("answer", {
        type: "answer",
        from: username,
        to: chat,
        sdp: myPeerConnection.localDescription,
    });
}

function createPeerConnection() {
    myPeerConnection = new RTCPeerConnection(config);

    myPeerConnection.onnegotiationneeded = onNegotiationNeeded;
    myPeerConnection.ontrack = onTrack;
    myPeerConnection.onicecandidate = onIceCandidate;
}

async function onNegotiationNeeded() {
    const offer = await myPeerConnection.createOffer();
    await myPeerConnection.setLocalDescription(offer);

    socket.emit("call", {
        type: "offer",
        from: username,
        to: chat,
        sdp: myPeerConnection.localDescription,
    });
}

function onTrack(event) {
    console.log(event.streams[0]);
    document.getElementById("remote-video").srcObject = event.streams[0];
}

function onIceCandidate(event) {
    if (event.candidate.length > 0) {
        socket.emit("new-ice-candidate", {
            type: "new-ice-candidate",
            to: chat,
            candidate: event.candidate,
        });
    }
}

function handleNewIceCandidate(msg) {
    if (msg.candidate.length > 0) {
        try {
            myPeerConnection
                .addIceCandidate(msg.candidate)
                .catch((error) => console.log(error));
        } catch {
            console.error("error");
        }
    }
}
