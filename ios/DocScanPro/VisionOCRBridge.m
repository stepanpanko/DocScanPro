#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VisionOCR, NSObject)
RCT_EXTERN_METHOD(recognize:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
