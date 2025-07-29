export const data = {
    foo: {},
    diffs: {
        singleLine: `diff --git a/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs b/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs
index 6e260260..204f3ac4 100644
--- a/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs	
+++ b/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs	
@@ -2465,6 +2465,12 @@ namespace Example.Project.Module.AppProcessingServiceReference {
         [System.Runtime.Serialization.OptionalFieldAttribute()]
         private bool MatchedField;
         
+        [System.Runtime.Serialization.OptionalFieldAttribute()]
+        private string MaxPellIndicatorField;
+        
+        [System.Runtime.Serialization.OptionalFieldAttribute()]
+        private string MinPellIndicatorField;
+        
         [System.Runtime.Serialization.OptionalFieldAttribute()]
         private string PEFCField;
         
@@ -2528,6 +2534,32 @@ namespace Example.Project.Module.AppProcessingServiceReference {
             }
         }
         
+        [System.Runtime.Serialization.DataMemberAttribute()]
+        public string MaxPellIndicator {
+            get {
+                return this.MaxPellIndicatorField;
+            }
+            set {
+                if ((object.ReferenceEquals(this.MaxPellIndicatorField, value) != true)) {
+                    this.MaxPellIndicatorField = value;
+                    this.RaisePropertyChanged("MaxPellIndicator");
+                }
+            }
+        }
+        
+        [System.Runtime.Serialization.DataMemberAttribute()]
+        public string MinPellIndicator {
+            get {
+                return this.MinPellIndicatorField;
+            }
+            set {
+                if ((object.ReferenceEquals(this.MinPellIndicatorField, value) != true)) {
+                    this.MinPellIndicatorField = value;
+                    this.RaisePropertyChanged("MinPellIndicator");
+                }
+            }
+        }
+`,
        multiLine: `diff --git a/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs b/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs
index 6e260260..204f3ac4 100644
--- a/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs	
+++ b/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs	
@@ -2465,6 +2465,12 @@ namespace Example.Project.Module.AppProcessingServiceReference {
         [System.Runtime.Serialization.OptionalFieldAttribute()]
         private bool MatchedField;
         
+        [System.Runtime.Serialization.OptionalFieldAttribute()]
+        private string MaxPellIndicatorField;
+        
+        [System.Runtime.Serialization.OptionalFieldAttribute()]
+        private string MinPellIndicatorField;
+        
         [System.Runtime.Serialization.OptionalFieldAttribute()]
         private string PEFCField;
         
@@ -2528,6 +2534,32 @@ namespace Example.Project.Module.AppProcessingServiceReference {
             }
         }
         
+        [System.Runtime.Serialization.DataMemberAttribute()]
+        public string MaxPellIndicator {
+            get {
+                return this.MaxPellIndicatorField;
+            }
+            set {
+                if ((object.ReferenceEquals(this.MaxPellIndicatorField, value) != true)) {
+                    this.MaxPellIndicatorField = value;
+                    this.RaisePropertyChanged("MaxPellIndicator");
+                }
+            }
+        }
+        
+        [System.Runtime.Serialization.DataMemberAttribute()]
+        public string MinPellIndicator {
+            get {
+                return this.MinPellIndicatorField;
+            }
+            set {
+                if ((object.ReferenceEquals(this.MinPellIndicatorField, value) != true)) {
+                    this.MinPellIndicatorField = value;
+                    this.RaisePropertyChanged("MinPellIndicator");
+                }
+            }
+        }
+`,
    },
    reviews: {
        singleLine: {
            threads: [
                {
                    comments: [
                        {
                            content:
                                'Using `object.ReferenceEquals` to compare strings can lead to incorrect results. Consider using `!=` or `!string.Equals` for value-based comparison.',
                            commentType: 2,
                            fixSuggestion: '',
                            issueType: 'bug',
                        },
                    ],
                    status: 1,
                    threadContext: {
                        filePath:
                            '/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs',
                        rightFileStart: {
                            line: 2540,
                            snippet: 'if ((object.ReferenceEquals(this.MaxPellIndicatorField, value) != true)) {',
                            offset: 24,
                        },
                        rightFileEnd: {
                            line: 2540,
                            offset: 80,
                        },
                    },
                },
            ],
        },
        multiLine: {
            threads: [
                {
                    comments: [
                        {
                            content:
                                'Using `object.ReferenceEquals` to compare strings can lead to incorrect results. Consider using `!=` or `!string.Equals` for value-based comparison.',
                            commentType: 2,
                            fixSuggestion: '',
                            issueType: 'bug',
                        },
                    ],
                    status: 1,
                    threadContext: {
                        filePath:
                            '/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs',
                        rightFileStart: {
                            line: 2540,
                            snippet:
                                'if ((object.ReferenceEquals(this.MaxPellIndicatorField, value) != true)) {\n                    this.MaxPellIndicatorField = value;',
                            offset: 24,
                        },
                        rightFileEnd: {
                            line: 2540,
                            offset: 80,
                        },
                    },
                },
            ],
        },
        multiLineWithCarriageReturn: {
            threads: [
                {
                    comments: [
                        {
                            content:
                                'Using `object.ReferenceEquals` to compare strings can lead to incorrect results. Consider using `!=` or `!string.Equals` for value-based comparison.',
                            commentType: 2,
                            fixSuggestion: '',
                            issueType: 'bug',
                        },
                    ],
                    status: 1,
                    threadContext: {
                        filePath:
                            '/Example.Project.Module/Service References/AppProcessingServiceReference/Reference.cs',
                        rightFileStart: {
                            line: 2540,
                            snippet:
                                'if ((object.ReferenceEquals(this.MaxPellIndicatorField, value) != true)) {\r\n                    this.MaxPellIndicatorField = value;',
                            offset: 24,
                        },
                        rightFileEnd: {
                            line: 2540,
                            offset: 80,
                        },
                    },
                },
            ],
        },
    },
};

export default data;
