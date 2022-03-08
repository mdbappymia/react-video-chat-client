import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import CopyToClipboard from "react-copy-to-clipboard";
import "./App.css";

const socket = io.connect("http://localhost:5000");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        myVideo.current.srcObject = stream;
      });

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  return (
    <div className=" bg-violet-500 min-h-screen ">
      <h1 className="text-center font-bold text-5xl uppercase text-white py-10">
        Video Chat
      </h1>
      <div className="container m-auto">
        <div className="video-container lg:w-1/2 m-auto flex justify-around">
          <div className="video bg-white h-48 w-48">
            {stream && (
              <video
                playsInline
                ref={myVideo}
                autoPlay
                style={{ width: "300px" }}
              />
            )}
          </div>
          <div className="video h-48 bg-white w-48">
            {callAccepted && !callEnded ? (
              <video
                playsInline
                ref={myVideo}
                autoPlay
                style={{ width: "300px" }}
              />
            ) : null}
          </div>
        </div>

        <div className="lg:w-1/2 m-auto">
          <input
            type="text"
            className=" p-3 text-xl w-full my-5"
            placeholder="Set Your Name"
            onChange={(e) => setName(e.target.value)}
          />
          <CopyToClipboard text={me}>
            <button className="bg-indigo-700 text-white font-bold block px-3 py-2">
              Copy Id
            </button>
          </CopyToClipboard>

          <input
            type="text"
            className=" p-3 text-xl w-full my-5"
            placeholder="Enter Caller Id"
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <button
                className="bg-red-500 px-2 py-2 font-bold text-white hover:bg-red-600"
                onClick={leaveCall}
              >
                End Call
              </button>
            ) : (
              <button
                className="bg-green-500 p-3 text-white hover:text-gray-200 hover:bg-green-800 rounded-full text-4xl"
                onClick={() => callUser(idToCall)}
              >
                <i className="fas fa-phone"></i>
              </button>
            )}
            <span className=" inline-block ml-5 text-4xl text-white">
              {idToCall}
            </span>
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="text-center">
              <h1 className="text-3xl">{name} is calling...</h1>
              <button
                className=" bg-green-500 font-bold text-xl hover:bg-green-700 text-white px-3 py-2 m-4 rounded-lg"
                onClick={answerCall}
              >
                Answer
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
