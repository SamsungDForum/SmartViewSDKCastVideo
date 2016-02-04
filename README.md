# SmartViewSDKCastVideo
UX Guideline on connection/disconnection 

## Search

1)	Display a cast icon when TV and mobile are on the same network and TV supports Smart View SDK


- 	Display cast icon on the right-hand corner of the mobile app

 ![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast01.png)

2)	At a click of the cast icon, display a list of all available devices 

![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast02.png)

## Supported Model/Version
1)	On mobile app install stage, provide a description on supported TV devices on Playstore or iTunes

	[Supported Devices]
	– Samsung Smart TV
	. 2014 : H4500, H5500 and above (except H6003/H6103/H6153/H6201/H6203).
	. 2015 : J4500, J5500 and above (except J6203).

2)	At a click of the cast icon, display a list of all available devices

3)	(Not installed) On mobile, get confirmation from user and give installation guide


- A.	After confirmation, TV goes to install page


- B.	Provide a guideline saying “Use TV remote to download and open the app > Hit the cast icon again to connect”

## Connect

1)	Show ‘Connecting’ status with animation on cast icon

2)	Display ‘Connected’ status on cast icon
 
![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast03.png)

3)	(Connect and Play) When connection comes first, selecting content directly plays it on TV


- A.	TV app goes to the home screen and stay
    
![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast04.png)


- B.	When a content is requested from mobile, TV app plays the content
   
![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast05.png)

4)	(Play and Connect) When content is being played on mobile first, connection makes content stop on mobile and makes the TV to continue



- A.	Display cast icon on the right-hand corner of content screen 
(Both on portrait and landscape mode)
   
![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast06.png)

- B.	Play content on TV from where the mobile left (Timeline is synced on mobile and TV)

![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast07.png)    


- C.	On content screen in content detail page, display ‘casting’ status and content information(e.g. content title, timeline, thumbnail) which is being casted
 
![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast08.png)

## Browse and Control

1)	Display ‘Now playing’ status with content information while browsing other pages on mobile


- A.	‘Now playing’ is shown on part of mobile screen
 
![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast09.png)

- B.	As a cue, when clicking the ‘Now playing’ section, make user direct to the content detail page where user can control the playback of casted content

![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast10.png)

2)	Show information on casting status and available options when clicking the cast icon on ‘Connected’ status



- A.	Connected device name

- B.	Disconnect
 
![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast11.png)

- C.	Content information which is being casted


- D.	Playback control (e.g. on-screen volume control, pause)

3)	Volume control


- A.	Control TV system volume only by TV remote


- B.	Do not provide other ways on mobile to control TV app volume control


## Mobile and TV sync

1)	Show the same feedback on mobile and TV screen during app loading or content loading


- A.	Loading animation


- B.	Content title
 
![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast12.png)

2)	Show the same control options on mobile and TV (FF, RW, Play, Stop, Pause)


- A.	When controlled by mobile, give feedback on TV screen saying that it is reflected


- B.	Timeline is synced on mobile and TV

![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast13.png)
   
3)	When the TV app is controlled by TV remote, the status is updated on mobile as well
A.	Even when TV app is launched first by remote and connection comes next, the status of TV app will be updated on mobile when connected.

## Disconnect

1)	Disconnect has only one option and let the TV app stay even when disconnected


- A.	TV app goes to the home screen no matter whether a content is being played or not


- B.	Mobile app goes to content detail page with the content paused, when a content is being played on TV

![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast14.png)

- C.	Mobile app goes to where it was(e.g. content detail page or home screen), when no content is being played on TV

![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast15.png)

## Multitasking

1)	When TV app is on background(e.g. using another app like a web browser), the connection remains and mobile shows ‘Connected’ status

  ![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast16.png)

  ![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast17.png)


2)	While connected, TV app comes to foreground from background at request from mobile

  ![](/SmartViewSDKCastVideo_ScreenShot/SmartViewSDK_VideoCast18.png)


