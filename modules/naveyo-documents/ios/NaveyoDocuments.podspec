require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), 'scripts/autolinking')

Pod::Spec.new do |s|
  s.name           = 'NaveyoDocuments'
  s.version        = '0.1.0'
  s.summary        = 'Local PDFKit, Vision and DataDetection analysis for Naveyo documents.'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :path => '.' }
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
