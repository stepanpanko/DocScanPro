#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ImageFilters, NSObject)
RCT_EXTERN_METHOD(process:(NSString *)src
                options:(NSDictionary *)options
                resolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject)
@end
