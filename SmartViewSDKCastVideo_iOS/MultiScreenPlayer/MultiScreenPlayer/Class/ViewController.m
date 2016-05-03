#import "ViewController.h"
#import "ContentTableViewCell.h"
#import <MediaPlayer/MediaPlayer.h>
#import "DataManager.h"
#import "Util.h"


// CastState 3 state
enum CastState{
    CastStateUnknown,
    CastStatePlay,
    CastStatePause,
};


@interface ViewController ()<UITableViewDataSource, UITableViewDelegate>
{
    NSArray *contentsArray;

    // for cashed image
    NSMutableDictionary *cachedImagesDic;
    
    // Outlet
    __weak IBOutlet UIButton *castIcon;
    __weak IBOutlet UIImageView *castAniImageView;
    
    __weak IBOutlet UILabel *connectedTvLabel;
    IBOutlet UIView *castDisconnectDialogBox;
    IBOutlet UIView *connectionGuideDialogBox;
    __weak IBOutlet UITextView *connectionGuideTextView;
    
    __weak IBOutlet UITableView *contentsTable;
    
    // TitleView
    __weak IBOutlet UILabel *topTitleLabel;
    __weak IBOutlet UIButton *castTvStateIconButton;
    __weak IBOutlet NSLayoutConstraint *constraintTvStateIconVsTitleLabel;

    // CastView
    
    IBOutlet UIView *castView;
    __weak IBOutlet UILabel *castingLabel;
    __weak IBOutlet UIView *volumeView;
    __weak IBOutlet UILabel *volumeLabel;
    NSTimer *volumeTimer;
    NSTimer *sliderChangeTimer;
    BOOL isCastSliderMoving;
    

    __weak IBOutlet UIImageView *castBackgroundImageView;
    __weak IBOutlet UIButton *castPlayPauseButton;
    
    __weak IBOutlet UILabel *castPlayTimeLabel;
    __weak IBOutlet UILabel *castPlayTotalTimeLabel;
    __weak IBOutlet UISlider *castSlider;
    
    // Movie View
    __weak IBOutlet UIView *movieBackgroundView;
    __weak IBOutlet UIView *moviePlayerView;
    
    MPMoviePlayerController *moviePlayer;
    UIView *overDisplayView;
    
    
    
    // Local play control buttons
    __weak IBOutlet UIButton *rewindBtnLocal;
    __weak IBOutlet UIButton *playBtnLocal;
    __weak IBOutlet UIButton *forwardBtnLocal;
    __weak IBOutlet UIActivityIndicatorView *indicatorMovie;
    
    // Indicator View
    IBOutlet UIView *indicatorViewMovie;
   
    // Layout
    __weak IBOutlet NSLayoutConstraint *tableTopConstraint;
    __weak IBOutlet NSLayoutConstraint *titleTopConstraint;
    __weak IBOutlet NSLayoutConstraint *movieViewHeightConstraint;
    __weak IBOutlet NSLayoutConstraint *castControlViewWidthConstraint;
    
    __weak IBOutlet NSLayoutConstraint *connectionGuideDialogViewHeightConstraint;
    enum ViewStyleOption currentViewStyle;
    
    // Movie Status
    BOOL playbackDurationSet;  // for set streaming initialPlaybackTime;
    BOOL castViewCommand;

    NSInteger selectedCellIndex;
    int videoId; //need for play after connect
    int volume;
    
    // Cast State
    enum CastState castState;
    //playback Slider
    int totalTimeMiliSecond; // need;
    int lastPlaybackMiliSecondForLocalPlay;
    
    
    // Playback Position
    int   position;
    float playbackTime;
    float sliderValue;

}
@property(nonatomic, assign) BOOL isCastSliderLock;


@end

@implementation ViewController

#pragma mark - event handling

- (IBAction)onTvStateIconButton:(id)sender
{
    [self viewStyleChange:ViewStyleOptionCastMovie];
}


- (IBAction)onCastButton:(id)sender
{
    NSLog(@"onCastButton:" );
    if ([DataManager getInstance].isConnectedTvApp == NO) {
        // TV connect
        // prepare data for contine-play
        if (moviePlayer) {
            [moviePlayer pause];
        }
        
        if (currentViewStyle == ViewStyleOptionMovieDefault && moviePlayer.playbackState == MPMoviePlaybackStatePaused ) {
            // === >> prepare data(castPlayDataStringForAfterConnection)
            int positionMilisecond = moviePlayer.currentPlaybackTime*1000;
            NSString *json = [NSString stringWithFormat:@"{\"videoId\":%d,\"position\":%d}", videoId, positionMilisecond];
            NSLog(@"======>castPlayDataStringForAfterConnection:json: %@", json);
            [DataManager getInstance].castPlayDataStringForAfterConnection = json;
            castViewCommand = YES;
            //  << === data ready
        }else{
            [DataManager getInstance].castPlayDataStringForAfterConnection = nil;
        }
        
        self.definesPresentationContext = YES; //self is presenting view controller
        UIViewController *tvSelectVC = [self.storyboard instantiateViewControllerWithIdentifier:@"TvSelectView"];
        tvSelectVC.modalPresentationStyle = UIModalPresentationOverCurrentContext;
        [self presentViewController:tvSelectVC animated:NO completion:nil];

    }else{
        [self showCastDisconnectDialogBox];
    }
}

-(void)showCastDisconnectDialogBox
{
    connectedTvLabel.text = [DataManager getInstance].connectedService.name;
    castDisconnectDialogBox.frame = self.view.bounds;
    castDisconnectDialogBox.backgroundColor = [UIColor colorWithRed:100/255 green:100/255 blue:100/255 alpha:0.7f];
    [self.view addSubview:castDisconnectDialogBox];
}

-(void)showConnectionGuideDialogBox
{
    connectionGuideDialogBox.frame = self.view.bounds;
    connectionGuideDialogBox.backgroundColor = [UIColor colorWithRed:100/255 green:100/255 blue:100/255 alpha:0.7f];
    [self.view addSubview:connectionGuideDialogBox];
}


- (IBAction)onCastDisconnectDialogBoxSelected:(UIButton*)sender {
    [castDisconnectDialogBox removeFromSuperview];
    switch (sender.tag) {
            
        case 0://Disconnect (close TV Application) - Not Use
            //if playing then stop.
            [self onStopCastBtn:nil];
            [[DataManager getInstance] disconnectQuick:NO];
            break;
            
        case 1://Disconnect (leave TV Application)
            [[DataManager getInstance] disconnectQuick:YES];
            break;
            
        default://2.Cancel
            [castDisconnectDialogBox removeFromSuperview];
            break;
    }
    
    if (sender.tag < 2) {
        // prepare local play & play
        NSLog(@"prepare local play & play");
        if (castState != CastStateUnknown) {
            [self viewStyleChange:ViewStyleOptionMovieDefault];
            [self playLocalByIndex:selectedCellIndex];
        }else{
            [self viewStyleChange:ViewStyleOptionContentsTable];
        }
    }
}


#pragma mark - << Movie Control >>
#pragma mark  Cast Movie Control
-(void)castPlayMovieByIndex:(NSInteger)index
{
    int contentId = [[[contentsArray objectAtIndex:index]objectForKey:@"id"]intValue];
    NSString *json = [NSString stringWithFormat:@"{\"videoId\":%d,\"position\":0}", contentId];
    [[DataManager getInstance].app publishWithEvent:@"play" message:json];
    castViewCommand = YES;
    castSlider.enabled = NO;

    
}

// Slider Draging Control
-(IBAction)onSliderMoveStart:(id)sender
{
    isCastSliderMoving = YES;
}

- (IBAction)onSliderMoving:(id)sender {
    int milisecond = castSlider.value*totalTimeMiliSecond;
    castPlayTimeLabel.text = [Util timeStringFromInteger:milisecond];
}

- (void)onSliderLockFreeTimerFire
{
    if (sliderChangeTimer != nil) {
        [sliderChangeTimer invalidate];
        sliderChangeTimer = nil;
    }
    self.isCastSliderLock = NO;
}

- (IBAction)onSliderValueChange:(id)sender {
    castSlider.enabled = NO;

    int milisecond = castSlider.value*totalTimeMiliSecond;
    
    NSString *json = [NSString stringWithFormat:@"{\"position\":%d}", milisecond];
    NSLog(@"======>onSliderValueChange:json: %@", json);
    [[DataManager getInstance].app publishWithEvent:@"seek" message:json];
    
    // Cast Slider Lock
    self.isCastSliderLock = YES;
    NSLog(@"onSliderMove Drag start");
    if (sliderChangeTimer != nil) {
        [sliderChangeTimer invalidate];
        sliderChangeTimer = nil;
    }
    
    sliderChangeTimer = [NSTimer scheduledTimerWithTimeInterval:4.5 target:self selector:@selector(onSliderLockFreeTimerFire) userInfo:nil repeats:NO];
    
    isCastSliderMoving = NO;

}


- (IBAction)onRewindCastBtn:(id)sender {
    NSString *json = @"{\"keycode\":\"MediaRewind\"}";
    [[DataManager getInstance].app publishWithEvent:@"keydown" message:json];
}

- (IBAction)onPlayPauseCastBtn:(UIButton*)sender {
    sender.selected = !sender.selected;
    NSString *json = @"{\"keycode\":\"MediaPlayPause\"}";
    [[DataManager getInstance].app publishWithEvent:@"keydown" message:json];
}

- (IBAction)onStopCastBtn:(id)sender {
    NSString *json = @"{\"keycode\":\"MediaStop\"}";
    [[DataManager getInstance].app publishWithEvent:@"keydown" message:json];
    [self viewStyleChange:ViewStyleOptionContentsTable];
}

- (IBAction)onForwardCastBtn:(id)sender {
    NSString *json = @"{\"keycode\":\"MediaFastForward\"}";
    [[DataManager getInstance].app publishWithEvent:@"keydown" message:json];
}

- (IBAction)onVolumeDownBtn:(id)sender {
    NSString *json = [NSString stringWithFormat:@"{\"value\":%d}", (volume > 0)?--volume:volume];
    [[DataManager getInstance].app publishWithEvent:@"volume" message:json];
    [self volumeShow];
}

- (IBAction)onVolumeUpBtn:(id)sender {
    NSString *json = [NSString stringWithFormat:@"{\"value\":%d}", (volume < 100)?++volume:volume];
    [[DataManager getInstance].app publishWithEvent:@"volume" message:json];
    [self volumeShow];
}


#pragma mark Local Movie Control
- (IBAction)onRewindBtn:(id)sender {
    float ti = moviePlayer.currentPlaybackTime;
    moviePlayer.currentPlaybackTime = ti -15;
    NSLog(@"playbackTime: %f ---> %f",ti, moviePlayer.currentPlaybackTime);
}

- (IBAction)onPlayBtn:(id)sender {
    //        MPMoviePlaybackStateStopped,
    //        MPMoviePlaybackStatePlaying,
    //        MPMoviePlaybackStatePaused,
    //        MPMoviePlaybackStateInterrupted,
    //        MPMoviePlaybackStateSeekingForward,
    //        MPMoviePlaybackStateSeekingBackward
    if (moviePlayer.playbackState == MPMoviePlaybackStatePaused ) {
        playBtnLocal.selected = YES;
        [moviePlayer play];
    }else{
        playBtnLocal.selected = NO;
        [moviePlayer pause];
    }
}

- (IBAction)onStopBtn:(id)sender {
    [moviePlayer stop];
    [self viewStyleChange:ViewStyleOptionContentsTable];
}

- (IBAction)onForwardBtn:(id)sender {
    float ti = moviePlayer.currentPlaybackTime;
    moviePlayer.currentPlaybackTime = ti +15;
    NSLog(@"playbackTime: %f ---> %f",ti, moviePlayer.currentPlaybackTime);
}

- (void)playLocalByIndex:(NSInteger)index
{
    // clean old object
    if (moviePlayer != nil) {
        [self deletePlayerAndNotificationObservers];
    }
    
    // Title Label
    topTitleLabel.text = [[contentsArray objectAtIndex:index]objectForKey:@"title"];
    
    // URL
    NSString *urlString = [[contentsArray objectAtIndex:index]objectForKey:@"url"];
    NSURL *url = [NSURL URLWithString:urlString];
    moviePlayer = [[MPMoviePlayerController alloc]initWithContentURL:url];
    
    moviePlayer.view.frame = moviePlayerView.bounds;
    [moviePlayerView addSubview:moviePlayer.view];
    
    // Indicator
    indicatorViewMovie.frame = movieBackgroundView.bounds;
    indicatorViewMovie.hidden = NO;
    [movieBackgroundView addSubview:indicatorViewMovie];
    
    moviePlayer.shouldAutoplay = YES;
    moviePlayer.scalingMode = MPMovieScalingModeAspectFit;
    moviePlayer.controlStyle = MPMovieControlStyleDefault;
    //MPMovieControlStyleEmbedded None;
    
    playBtnLocal.selected = YES;
    
    // tv -> local continue play
    //    NSLog(@"is continue play? : castState: %d  \nlastPlaybackMiliSecondForLocalPlay: %d", castState,lastPlaybackMiliSecondForLocalPlay);
    if (castState == CastStatePause||castState == CastStatePlay) {
        moviePlayer.initialPlaybackTime = lastPlaybackMiliSecondForLocalPlay*0.001;
        playbackDurationSet = NO;
    }else{
        playbackDurationSet=YES;
    }
    
    [self installMovieNotificationObservers];
    [moviePlayer play];
}


#pragma mark - life cycle

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view, typically from a nib.
    [self prepareContentList];
//    selectedCellIndex = 999;
    
    contentsTable.delegate = self;
    contentsTable.dataSource = self;
    
    [self viewStyleChange:ViewStyleOptionContentsTable];
    
    id object = [DataManager getInstance];
    [[NSNotificationCenter defaultCenter]
     addObserver:self
     selector:@selector(handleNotification:)
     name:USER_NOTIFICATION_READY
     object:object];
    
    [[NSNotificationCenter defaultCenter]
     addObserver:self
     selector:@selector(handleNotification:)
     name:USER_NOTIFICATION_CONNECTING
     object:object];
    
    [[NSNotificationCenter defaultCenter]
     addObserver:self
     selector:@selector(handleNotification:)
     name:USER_NOTIFICATION_DISCONNECTED
     object:object];

    [[NSNotificationCenter defaultCenter]
     addObserver:self
     selector:@selector(handleNotification:)
     name:USER_NOTIFICATION_DEVICE_FIND_STATUS_CHANGE
     object:object];
    
    [[NSNotificationCenter defaultCenter]
     addObserver:self
     selector:@selector(handleNotification:)
     name:USER_NOTIFICATION_SUSPEND
     object:object];
    
    [[NSNotificationCenter defaultCenter]
     addObserver:self
     selector:@selector(handleNotification:)
     name:USER_NOTIFICATION_RESTORE
     object:object];
    
    
    //
    [DataManager getInstance].mainViewController = self;
    
    // Connection Guide Link Button
    CGSize size = connectionGuideTextView.contentSize;
    UIButton *linkButton = [UIButton buttonWithType:UIButtonTypeRoundedRect];
    linkButton.frame = CGRectMake(23, size.height-27, 100, 20);
    [linkButton addTarget:self action:@selector(onHyperLinkButton) forControlEvents:UIControlEventTouchUpInside];
    [linkButton setTitle:@"(Go Link)" forState:UIControlStateNormal];
    
    [connectionGuideTextView  addSubview:linkButton];
}

-(void)onHyperLinkButton
{
    NSString *urlString = @"http://www.samsungdforum.com/TizenGuide/tizen4671/index.html";
    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:[urlString stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding]]];

}
- (IBAction)onConnectionGuideCancelButton:(id)sender {
    [connectionGuideDialogBox removeFromSuperview];
}

- (void)viewDidAppear:(BOOL)animated
{
    if ([DataManager getInstance].isConnectedTvApp == YES) {
        castIcon.selected = YES;
    }else{
        castIcon.selected = NO;
    }
}

- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}


#pragma mark - << Observe Notification >>
#pragma mark User Notification Handlers
// when a User Notification is received
- (void)handleNotification:(NSNotification*)noti {
    NSLog(@"Got notified: %@", noti.name);
    if ([noti.name isEqualToString:USER_NOTIFICATION_DISCONNECTED] ) {
        castIcon.selected = NO;
        [DataManager getInstance].isConnectedTvApp = NO;
        [self updateTvStateIcon];
        [self castIconAnimate:NO];
        
    }else if ([noti.name isEqualToString:USER_NOTIFICATION_CONNECTING] ) {
        [self castIconAnimate:YES];
        castIcon.selected = NO;
        
    }else if ([noti.name isEqualToString:USER_NOTIFICATION_DEVICE_FIND_STATUS_CHANGE] ) {
        castIcon.alpha = [DataManager getInstance].isFindDevice?1.0f:0.3f;
    }else if ([noti.name isEqualToString:USER_NOTIFICATION_SUSPEND] ) {
        castIcon.selected = NO;
        [self viewStyleUpdateToTable];
        
    }else if ([noti.name isEqualToString:USER_NOTIFICATION_RESTORE] ) {
        castIcon.selected = YES;
  
    }else if([noti.name isEqualToString:USER_NOTIFICATION_READY] ) {
        [self castIconAnimate:NO];
        castIcon.selected = YES;
        if(moviePlayer){
            [self deletePlayerAndNotificationObservers];
        }
            
        if (currentViewStyle != ViewStyleOptionContentsTable) {
            [self viewStyleChange:ViewStyleOptionCastMovie];
        }
    }else{
        NSLog(@"Got unknown notified: %@", noti.name);
    }
    
}

#pragma mark Movie Notification Handlers

/*  Notification called when the movie finished playing. */
- (void) moviePlayBackDidFinish:(NSNotification*)notification
{
    NSLog(@"moviePlayBackDidFinish Notificationnotification: %@", notification);

    NSNumber *reason = [notification userInfo][MPMoviePlayerPlaybackDidFinishReasonUserInfoKey];
    switch ([reason integerValue])
    {
            /* The end of the movie was reached. */
        case MPMovieFinishReasonPlaybackEnded:
            /*
             Add your code here to handle MPMovieFinishReasonPlaybackEnded.
             */
            NSLog(@"The end of the movie was reached");
            [self viewStyleChange:ViewStyleOptionContentsTable];
           break;
            
            /* An error was encountered during playback. */
        case MPMovieFinishReasonPlaybackError:
            NSLog(@"An error was encountered during playback");

            break;
            
            /* The user stopped playback. */
        case MPMovieFinishReasonUserExited:
            NSLog(@"The user stopped playback.");
            break;
            
        default:
            NSLog(@"An Unknown error was encountered during playback");
         break;
    }
}

/* Handle movie load state changes. */
- (void)loadStateDidChange:(NSNotification *)notification
{
//    NSLog(@"loadStateDidChange Notificationnotification: %@", notification);

    MPMoviePlayerController *player = notification.object;
    MPMovieLoadState loadState = player.loadState;
    
    /* The load state is not known at this time. */
    if (loadState == MPMovieLoadStateUnknown)
    {
        NSLog(@"unknown");
   
    }
    
    /* The buffer has enough data that playback can begin, but it
     may run out of data before playback finishes. */
    if (loadState & MPMovieLoadStatePlayable)
    {
//        NSLog(@"playable");
    }
    
    /* Enough data has been buffered for playback to continue uninterrupted. */
    if (loadState & MPMovieLoadStatePlaythroughOK)
    {
        // Add an overlay view on top of the movie view
//        NSLog(@"playthrough ok");
    }
    
    /* The buffering of data has stalled. */
    if (loadState & MPMovieLoadStateStalled)
    {
        NSLog(@"stalled");
        
    }
}

/* Called when the movie playback state has changed. */
- (void) moviePlayBackStateDidChange:(NSNotification*)notification
{
//    NSLog(@"moviePlayBackStateDidChange Notificationnotification: %@", notification);

    MPMoviePlayerController *player = notification.object;
    
    /* Playback is currently stopped. */
    if (player.playbackState == MPMoviePlaybackStateStopped)
    {
//        NSLog(@"stopped");
    }
    /*  Playback is currently under way. */
    else if (player.playbackState == MPMoviePlaybackStatePlaying)
    {
//        NSLog(@"playing");
        playBtnLocal.selected = YES;
        
        // initialPlaybackTime set
        if(!playbackDurationSet){
            NSLog(@"initialPlaybackTime: %f", moviePlayer.initialPlaybackTime);
            [moviePlayer setCurrentPlaybackTime:moviePlayer.initialPlaybackTime];
            playbackDurationSet=YES;
        }

    }
    /* Playback is currently paused. */
    else if (player.playbackState == MPMoviePlaybackStatePaused)
    {
//        NSLog(@"paused");
        playBtnLocal.selected = NO;
    }
    /* Playback is temporarily interrupted, perhaps because the buffer
     ran out of content. */
    else if (player.playbackState == MPMoviePlaybackStateInterrupted)
    {
        NSLog(@"interrupted");
    }
}

/* Notifies observers of a change in the prepared-to-play state of an object
 conforming to the MPMediaPlayback protocol. */
- (void) mediaIsPreparedToPlayDidChange:(NSNotification*)notification
{
    // Add an overlay view on top of the movie view
//    NSLog(@"mediaIsPreparedToPlayDidChange Notificationnotification: %@", notification);
    indicatorViewMovie.hidden = YES;
}

#pragma mark Install/Remove Movie Notifications

/* Register observers for the various movie object notifications. */
-(void)installMovieNotificationObservers
{
    MPMoviePlayerController *player = moviePlayer;
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(loadStateDidChange:)
                                                 name:MPMoviePlayerLoadStateDidChangeNotification
                                               object:player];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(moviePlayBackDidFinish:)
                                                 name:MPMoviePlayerPlaybackDidFinishNotification
                                               object:player];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(mediaIsPreparedToPlayDidChange:)
                                                 name:MPMediaPlaybackIsPreparedToPlayDidChangeNotification
                                               object:player];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(moviePlayBackStateDidChange:)
                                                 name:MPMoviePlayerPlaybackStateDidChangeNotification 
                                               object:player];        
}



/* Remove the movie notification observers from the movie object. */
-(void)removeMovieNotificationHandlers
{
    MPMoviePlayerController *player = moviePlayer;
    
    [[NSNotificationCenter defaultCenter]removeObserver:self name:MPMoviePlayerLoadStateDidChangeNotification object:player];
    [[NSNotificationCenter defaultCenter]removeObserver:self name:MPMoviePlayerPlaybackDidFinishNotification object:player];
    [[NSNotificationCenter defaultCenter]removeObserver:self name:MPMediaPlaybackIsPreparedToPlayDidChangeNotification object:player];
    [[NSNotificationCenter defaultCenter]removeObserver:self name:MPMoviePlayerPlaybackStateDidChangeNotification object:player];
}

/* Delete the movie player object, and remove the movie notification observers. */
-(void)deletePlayerAndNotificationObservers
{
    [self removeMovieNotificationHandlers];
    moviePlayer = nil;
}


#pragma mark - << function >>
#pragma mark  view style
-(void)viewStyleUpdateToTable
{
    if (ViewStyleOptionCastMovie == currentViewStyle) {
        [self viewStyleChange:ViewStyleOptionContentsTable];
    }
}

- (void)viewStyleChange:(enum ViewStyleOption) viewStyle
{
    if (viewStyle == currentViewStyle) {
        return;
    }
    NSLog(@"viewStyleChange:===>from : %d,  to: %d ", currentViewStyle, viewStyle);
    
    
    currentViewStyle = viewStyle;
    if (viewStyle == ViewStyleOptionContentsTable) {
        // Table state
        movieBackgroundView.hidden = YES;
        tableTopConstraint.priority = 100;
        
    }else{
        // player state
        movieBackgroundView.hidden = NO;
        tableTopConstraint.priority = 990;
        if (viewStyle == ViewStyleOptionCastMovie) {
            castView.frame = movieBackgroundView.bounds;
            [movieBackgroundView addSubview:castView];
        }else{
            [castView removeFromSuperview];
        }
    }
    
    [self updateTvStateIcon];
}

#pragma mark Cast Movie state message from TV
-(void)statusChangeFromTv: (NSDictionary *)dic
{
    // volume data
    int newVolume;
    NSString *volumeStrig = [dic objectForKey:@"volume"];
    if (volumeStrig) {
        newVolume = [volumeStrig intValue];
        if (newVolume != volume) {
            volume = newVolume;
            [self volumeShow];
        }
    }
    
    // cast state
    NSString *state = [dic objectForKey:@"state"];
    enum CastState tempCastState;
    if ([@"PLAYING" isEqualToString:state]) {
        tempCastState = CastStatePlay;
    }else if([@"PAUSED" isEqualToString:state]){
        tempCastState = CastStatePause;
    }else if([@"IDLE" isEqualToString:state]){
        tempCastState = CastStateUnknown;
    }else {
        NSLog(@"Tv State: Unknown(%@)", [dic objectForKey:@"state"]);
    }
    
    // Log once
    if (tempCastState != castState) {
        NSLog(@"Tv state change to: %@  position(%@)", state, [dic objectForKey:@"position"]);
        
        if (self.isCastSliderLock == NO && isCastSliderMoving == NO && (tempCastState == CastStatePlay || tempCastState == CastStatePause)) {
            castSlider.enabled = YES;
        }
    }
    
    // View Style change
    if(tempCastState != castState){
        if (tempCastState != CastStateUnknown){
            // play or paused
            switch (currentViewStyle) {
                case ViewStyleOptionMovieDefault:
                    [self viewStyleChange:ViewStyleOptionCastMovie];
                    break;
                    
                case ViewStyleOptionContentsTable:
                    break;
                    
                default:// ViewStyleOptionCastMovie
                    
                    break;
            }
            
            if (tempCastState == CastStatePlay) {
                castViewCommand = NO;
            }
            
        }else{
            //tempCastState == CastStateUnknown
            // idle when stop on tv
            if(currentViewStyle == ViewStyleOptionCastMovie){
                if (castViewCommand == NO) {
                    [self viewStyleChange:ViewStyleOptionContentsTable];
                }
            }
            castViewCommand = NO;
        }
//        castViewCommand = NO;
        
    }

    if (tempCastState == CastStatePlay) {
        //        NSLog(@"PLAYING position; %@", [dic objectForKey:@"position"]);
        castPlayPauseButton.selected = YES;
        
        int ti = [[dic objectForKey:@"position"]intValue];
        castPlayTimeLabel.text = [Util timeStringFromInteger:ti];
        lastPlaybackMiliSecondForLocalPlay = ti;
        
        int ti2 = [[dic objectForKey:@"totalTime"]intValue];
        totalTimeMiliSecond = ti2;
        castPlayTotalTimeLabel.text = [Util timeStringFromInteger:ti2];
        
        if (!(isCastSliderMoving||sliderChangeTimer)) {
            if (position != ti) {
                castSlider.enabled = YES;
            }
            sliderValue = (float)ti/ti2;
            [castSlider setValue:sliderValue animated:NO];
        }
        position = ti;
        
        if (castViewCommand == NO) {
            int newVideoId = [[dic objectForKey:@"videoId"]intValue];
            if ([DataManager getInstance].isConnectedTvApp && (videoId == 0 ||newVideoId -1 != selectedCellIndex)) {
                [self updateTableCellSelectedIndex:newVideoId -1];
            }
            videoId =  newVideoId;
        }
        
        
    }else if (tempCastState == CastStateUnknown) {
        NSLog(@"IDLE videoId; %@", [dic objectForKey:@"videoId"]);
        int videoIdValue = [[dic objectForKey:@"videoId"]intValue];
        if (videoId != videoIdValue) {
            videoId = videoIdValue;
            [self updateTableCellSelectedIndex:videoId -1];
        }
        
    }else if (tempCastState == CastStatePause) {
        //        NSLog(@"PAUSED position; %@", [dic objectForKey:@"position"]);
        castPlayPauseButton.selected = NO;
        
        
    }else{
        //  other messages
        NSLog(@"statusChangeFromTv dic; %@", dic);//ready message
        
    }
    castState = tempCastState;
    
    [self updateTvStateIcon];
}


#pragma mark etc function
-(void)castIconAnimate:(BOOL)isShow
{
    if (castAniImageView.animationImages == nil) {
        castAniImageView.animationImages = [NSArray arrayWithObjects:
                                                  [UIImage imageNamed:@"cast_0"],
                                                  [UIImage imageNamed:@"cast_1"],
                                                  [UIImage imageNamed:@"cast_2"],
                                                  [UIImage imageNamed:@"cast_1"],
                                                  nil];

    }
    [castAniImageView setAnimationDuration:1.0f];
    [castAniImageView setAnimationRepeatCount:0];

    if (isShow) {
        castAniImageView.hidden = NO;
        castIcon.hidden = YES;
        [castAniImageView startAnimating];
    }else{
        castAniImageView.hidden = YES;
        castIcon.hidden = NO;
        [castAniImageView stopAnimating];
    }
}

-(void)updateTvStateIcon
{
    if (currentViewStyle == ViewStyleOptionContentsTable) {
        castTvStateIconButton.hidden = (castState == CastStatePlay||castState == CastStatePause)? NO:YES;
        castTvStateIconButton.selected = (castState == CastStatePlay)? NO:YES;
        constraintTvStateIconVsTitleLabel.priority = 990;
    }else{
        castTvStateIconButton.hidden = YES;
    }
    
    if ([DataManager getInstance].isConnectedTvApp == NO) {
        castTvStateIconButton.hidden = YES;
    }
    
    if (castTvStateIconButton.hidden) {
        constraintTvStateIconVsTitleLabel.priority = 200;
    }else{
        constraintTvStateIconVsTitleLabel.priority = 990;
      
    }
    
}

-(void)updateTableCellSelectedIndex: (NSInteger) index
{
    // select cell
    NSIndexPath *indexPath = [NSIndexPath indexPathForItem:index inSection:0];
    [contentsTable selectRowAtIndexPath:indexPath animated:YES  scrollPosition:UITableViewScrollPositionNone];
    
    // change content data
    [self updateContentsChangeDataAndUiDataByContentIndex:index];
}

- (void)volumeShow
{
    volumeLabel.text = [NSString stringWithFormat:@"%d", volume];
    volumeView.hidden = NO;
    castingLabel.hidden = YES;
    
    if (volumeTimer) {
        [volumeTimer invalidate];
        volumeTimer = nil;
    }
    volumeTimer = [NSTimer scheduledTimerWithTimeInterval:5.5 target:self selector:@selector(volumeHidden) userInfo:nil repeats:NO];
}


- (void)volumeHidden
{
    volumeView.hidden = YES;
    castingLabel.hidden = NO;
}

- (void)prepareContentList
{
    NSString *path = [[NSBundle mainBundle]pathForResource:@"data" ofType:@"json"];
    NSData *data = [NSData dataWithContentsOfFile:path];
    NSDictionary *dic = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
//    NSLog(@"dic: %@", dic);
    
    contentsArray = [dic objectForKey:@"movies"];
}

-(UIImage*)cachedImagesURL:(NSString*)urlString
{
    if (cachedImagesDic == nil) {
        cachedImagesDic = [NSMutableDictionary dictionary];
    }
    UIImage *image = [cachedImagesDic objectForKey:urlString];
    if (image != nil) {
        return image;
    }else{
        return nil;
    }
}


-(void)updateContentsChangeDataAndUiDataByContentIndex:(NSInteger)index
{
    // init data
    selectedCellIndex = index;
    lastPlaybackMiliSecondForLocalPlay = 0;
    [DataManager getInstance].castPlayDataStringForAfterConnection = nil;
    totalTimeMiliSecond = [Util timeFromString:[[contentsArray objectAtIndex:index]objectForKey:@"playback"]];
    videoId = [[[contentsArray objectAtIndex:index]objectForKey:@"id"]intValue];
    
    // Title Label
    topTitleLabel.text = [[contentsArray objectAtIndex:index]objectForKey:@"title"];
    
    // Cast Playback Time Label
    castSlider.value = 0;
    castPlayTotalTimeLabel.text = [[contentsArray objectAtIndex:index]objectForKey:@"playback"] ;
    castPlayTimeLabel.text = @"00:00";
    
    NSString *imageUrlString = [[contentsArray objectAtIndex:index]objectForKey:@"imgUrl"];
    castBackgroundImageView.image =[cachedImagesDic objectForKey:imageUrlString];
}


#pragma mark - <UITableViewDelegate>
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath{
    
    /*
    //----> for debugging: preview castPlayView
    if (indexPath.row ==  selectedCellIndex && currentViewStyle == ViewStyleOptionMovieDefault) {
        // preview castPlayMovieView
        [self viewStyleChange:ViewStyleOptionCastMovie];
         if (moviePlayer) {
             [self deletePlayerAndNotificationObservers];
        }
        return;
        
    }else if(indexPath.row ==  selectedCellIndex && currentViewStyle == ViewStyleOptionCastMovie){
        return;
    }
    //<---- for debugging: preview castPlayView
    */
    
    if(indexPath.row ==  selectedCellIndex && currentViewStyle != ViewStyleOptionContentsTable){
        // pass touching twice..
        return;
    }
    
    // Init Data
    castState = CastStateUnknown;
    [self updateContentsChangeDataAndUiDataByContentIndex:indexPath.row];
    
    if ([DataManager getInstance].isConnectedTvApp) {
        // Cast Play
        [self viewStyleChange:ViewStyleOptionCastMovie];
        [self castPlayMovieByIndex:indexPath.row];
    }else{
        // Local play
        [self viewStyleChange:ViewStyleOptionMovieDefault];
        [self playLocalByIndex:indexPath.row];
    }
 }

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
    return contentsArray.count;
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
    static NSString *reuseIdentifier = @"ContentsCellReuseIdentifier";
    ContentTableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:reuseIdentifier forIndexPath:indexPath];
    cell.titleLabel.text = [[contentsArray objectAtIndex:indexPath.row]objectForKey:@"title"];
    cell.countLabel.text = [NSString stringWithFormat:@"%@ views",[[contentsArray objectAtIndex:indexPath.row]objectForKey:@"views"]];
    cell.timeLabel.text = [[contentsArray objectAtIndex:indexPath.row]objectForKey:@"playback"] ;
    
    NSString *imageUrlString = [[contentsArray objectAtIndex:indexPath.row]objectForKey:@"imgUrl"];
    
    cell.movieImageView.image = nil;
    cell.tag = indexPath.row;
    
    UIImage *contentImage = [self cachedImagesURL:imageUrlString];
    
    if (contentImage != nil) {
        cell.movieImageView.image = contentImage;
    }else{
        //image_async
        dispatch_queue_t queue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0);
        dispatch_async(queue, ^(void) {
            [cell.indicator startAnimating];
            
            NSData *imageData = [NSData dataWithContentsOfURL:[NSURL URLWithString:imageUrlString]];
            
            UIImage* image = [[UIImage alloc] initWithData:imageData];
            if (image) {
                [cachedImagesDic setObject:image forKey:imageUrlString];
                dispatch_async(dispatch_get_main_queue(), ^{
                    if (cell.tag == indexPath.row) {
                        cell.movieImageView.image = image;
                        [cell setNeedsLayout];
                        [cell.indicator stopAnimating];
                    }

                });
            }
        });
        
    }
   
    return cell;
}


#pragma mark - Interface Orientation
- (enum UIInterfaceOrientationMask)supportedInterfaceOrientations{
    return UIInterfaceOrientationMaskAllButUpsideDown;
}

//회전 이후 화면 처리
- (void)willAnimateRotationToInterfaceOrientation:(UIInterfaceOrientation)toInterfaceOrientation duration:(NSTimeInterval)duration
{
    if (toInterfaceOrientation == UIInterfaceOrientationLandscapeLeft||toInterfaceOrientation == UIInterfaceOrientationLandscapeRight) {
//        NSLog(@"Landscape");
        titleTopConstraint.constant = -20;
        movieViewHeightConstraint.constant = [UIScreen mainScreen].bounds.size.height - movieBackgroundView.frame.origin.y ;
        castControlViewWidthConstraint.constant = -([UIScreen mainScreen].bounds.size.width - 7*50);
        connectionGuideDialogViewHeightConstraint.priority = 500;
    } else {
//        NSLog(@"Portrait");
        titleTopConstraint.constant = 0;
        movieViewHeightConstraint.constant = 263;
        castControlViewWidthConstraint.constant = 0;
        connectionGuideDialogViewHeightConstraint.priority = 900;
    }
    [self updateOrientationViewSize];
}


- (void)didRotateFromInterfaceOrientation:(UIInterfaceOrientation)fromInterfaceOrientation
{
    [self updateOrientationViewSize];
}

-(void)updateOrientationViewSize
{
    [self updateViewConstraints];
    moviePlayer.view.frame = moviePlayerView.bounds;
    castView.frame = movieBackgroundView.bounds;
    connectionGuideDialogBox.frame = self.view.bounds;
    castDisconnectDialogBox.frame = self.view.bounds;
}

@end
